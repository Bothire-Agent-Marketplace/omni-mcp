import cors from "@fastify/cors";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import {
  MCPJsonRpcRequest,
  MCPJsonRpcResponse,
  createInvalidRequestErrorResponse,
  createInvalidParamsErrorResponse,
  createInternalErrorResponse,
  createMethodNotFoundErrorResponse,
} from "@mcp/schemas";
import { createMcpLogger } from "@mcp/utils";
import type {
  ServerCreationOptions,
  HandlerRegistries,
  EnhancedServerCreationOptions,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  RequestContext,
  OrganizationContext,
} from "./config.js";
import type { DynamicHandlerRegistry } from "./dynamic-handlers.js";

// ============================================================================
// ORGANIZATION CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract organization context from request headers
 */
function extractOrganizationContext(
  request: FastifyRequest
): RequestContext | undefined {
  // Try to extract organization context from various header formats
  const orgId = request.headers["x-organization-id"] as string;
  const orgClerkId = request.headers["x-organization-clerk-id"] as string;
  const orgName = request.headers["x-organization-name"] as string;
  const orgSlug = request.headers["x-organization-slug"] as string;
  const userId = request.headers["x-user-id"] as string;
  const requestId = request.headers["x-request-id"] as string;

  // If we have at least the organization ID, create the context
  if (orgId && orgClerkId && orgName && orgSlug) {
    const organization: OrganizationContext = {
      organizationId: orgId,
      organizationClerkId: orgClerkId,
      name: orgName,
      slug: orgSlug,
    };

    return {
      organization,
      userId,
      requestId,
    };
  }

  // Try to extract from JWT token in Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      // Parse JWT token to extract organization context
      // This is a simplified version - in production, you'd use a proper JWT library
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );

      if (payload.org) {
        const organization: OrganizationContext = {
          organizationId: payload.org.id,
          organizationClerkId: payload.org.clerk_id,
          name: payload.org.name,
          slug: payload.org.slug,
        };

        return {
          organization,
          userId: payload.sub,
          requestId: payload.jti,
        };
      }
    } catch {
      // JWT parsing failed, continue without organization context
    }
  }

  // Return undefined if no organization context found
  return undefined;
}

// ============================================================================
// GENERIC MCP HTTP SERVER FACTORY
// ============================================================================

/**
 * Creates a generic MCP HTTP server with standard protocol handling
 */
export function createMcpHttpServer<TClient = unknown>(
  options: ServerCreationOptions<TClient> & HandlerRegistries
): FastifyInstance {
  const {
    serverName,
    config,
    toolHandlers,
    resourceHandlers,
    promptHandlers,
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  } = options;

  const logger = createMcpLogger({
    serverName: `${serverName}-http-server`,
    logLevel: config.logLevel,
    environment: config.env,
  });

  const server = fastify({ logger: false }); // Disable default logger to use our own

  // Register CORS
  server.register(cors);

  // Global error handler
  server.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      logger.error("Unhandled error:", error);
      reply.status(500).send({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
      });
    }
  );

  // Health check endpoint
  server.get("/health", async () => {
    return { status: "ok" };
  });

  // Main MCP endpoint - handles tools, resources, and prompts
  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as MCPJsonRpcRequest;

    // Validate JSON-RPC format
    if (jsonrpc !== "2.0") {
      reply.status(400).send(createInvalidRequestErrorResponse(id));
      return;
    }

    // Extract organization context from request headers
    const requestContext = extractOrganizationContext(request);

    try {
      // Route to appropriate handler based on method using unified router
      const registry = createStaticHandlerRegistry({
        toolHandlers,
        resourceHandlers,
        promptHandlers,
        getAvailableTools,
        getAvailableResources,
        getAvailablePrompts,
      });
      const response = await routeMcpRequest(
        method,
        params,
        id,
        requestContext,
        registry
      );

      return response;
    } catch (error: unknown) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const validationErrors = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");

        reply
          .status(400)
          .send(createInvalidParamsErrorResponse(validationErrors, id));
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      reply.status(500).send(createInternalErrorResponse(errorMessage, id));
    }
  });

  return server;
}

/**
 * Creates an enhanced MCP HTTP server with dynamic handler support
 */
export function createEnhancedMcpHttpServer<TClient = unknown>(
  options: EnhancedServerCreationOptions<TClient> & HandlerRegistries
): FastifyInstance {
  const {
    serverName,
    serverKey,
    config,
    dynamicHandlers,
    fallbackHandlers,
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  } = options;

  const logger = createMcpLogger({
    serverName: `${serverName}-enhanced-http-server`,
    logLevel: config.logLevel,
    environment: config.env,
  });

  // Auto-create dynamic handlers if serverKey is provided
  let finalDynamicHandlers = dynamicHandlers;
  if (serverKey && !dynamicHandlers) {
    const { getServerRegistry } = require("./server-registry.js");
    const { DatabaseDynamicHandlerRegistry } = require("./dynamic-handlers.js");
    const { ConfigLoader } = require("@mcp/config-service");

    const serverRegistry = getServerRegistry(logger);
    const configLoader = new ConfigLoader();

    // Create dynamic handlers with server registry lookup
    const setupDynamicHandlers = async () => {
      const serverId = await serverRegistry.getServerId(serverKey);
      return new DatabaseDynamicHandlerRegistry(serverId, configLoader);
    };

    // For now, we'll create a lazy-loading dynamic handler
    finalDynamicHandlers = {
      async getToolHandler(toolName: string, context?: RequestContext) {
        const registry = await setupDynamicHandlers();
        return registry.getToolHandler(toolName, context);
      },
      async getResourceHandler(uri: string, context?: RequestContext) {
        const registry = await setupDynamicHandlers();
        return registry.getResourceHandler(uri, context);
      },
      async getPromptHandler(promptName: string, context?: RequestContext) {
        const registry = await setupDynamicHandlers();
        return registry.getPromptHandler(promptName, context);
      },
      async getAvailableTools(context?: RequestContext) {
        const registry = await setupDynamicHandlers();
        return registry.getAvailableTools(context);
      },
      async getAvailableResources(context?: RequestContext) {
        const registry = await setupDynamicHandlers();
        return registry.getAvailableResources(context);
      },
      async getAvailablePrompts(context?: RequestContext) {
        const registry = await setupDynamicHandlers();
        return registry.getAvailablePrompts(context);
      },
    };
  }

  const server = fastify({ logger: false }); // Disable default logger to use our own

  // Register CORS
  server.register(cors);

  // Global error handler
  server.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      logger.error("Unhandled error:", error);
      reply.status(500).send({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
      });
    }
  );

  // Health check endpoint
  server.get("/health", async () => {
    return { status: "ok" };
  });

  // Main MCP endpoint - handles tools, resources, and prompts
  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as MCPJsonRpcRequest;

    // Validate JSON-RPC format
    if (jsonrpc !== "2.0") {
      reply.status(400).send(createInvalidRequestErrorResponse(id));
      return;
    }

    // Extract organization context from request headers
    const requestContext = extractOrganizationContext(request);

    try {
      // Route to appropriate handler based on method using unified router
      const registry = createDynamicHandlerRegistry(
        finalDynamicHandlers,
        fallbackHandlers,
        {
          getAvailableTools: async (context?: RequestContext) =>
            normalizeToAsync(getAvailableTools(context)),
          getAvailableResources: async (context?: RequestContext) =>
            normalizeToAsync(getAvailableResources(context)),
          getAvailablePrompts: async (context?: RequestContext) =>
            normalizeToAsync(getAvailablePrompts(context)),
        }
      );
      const response = await routeMcpRequest(
        method,
        params,
        id,
        requestContext,
        registry
      );

      return response;
    } catch (error: unknown) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const validationErrors = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");

        reply
          .status(400)
          .send(createInvalidParamsErrorResponse(validationErrors, id));
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      reply.status(500).send(createInternalErrorResponse(errorMessage, id));
    }
  });

  return server;
}

// ============================================================================
// REQUEST ROUTING - CONSOLIDATED IMPLEMENTATION
// ============================================================================

/**
 * Consolidated handler interface - all async for consistency
 */
interface McpHandlerRegistry {
  // Handler resolution
  resolveToolHandler: (
    toolName: string,
    context?: RequestContext
  ) => Promise<ToolHandler | undefined>;
  resolveResourceHandler: (
    uri: string,
    context?: RequestContext
  ) => Promise<ResourceHandler | undefined>;
  resolvePromptHandler: (
    promptName: string,
    context?: RequestContext
  ) => Promise<PromptHandler | undefined>;

  // Listing functions
  getAvailableTools: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>
  >;
  getAvailableResources: (context?: RequestContext) => Promise<
    Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }>
  >;
  getAvailablePrompts: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
    }>
  >;
}

/**
 * Utility to normalize sync/async functions to async
 */
async function normalizeToAsync<T>(syncOrAsync: T | Promise<T>): Promise<T> {
  return Promise.resolve(syncOrAsync);
}

/**
 * Create handler registry from static handlers
 */
function createStaticHandlerRegistry(handlers: {
  toolHandlers: Record<string, ToolHandler>;
  resourceHandlers: Record<string, ResourceHandler>;
  promptHandlers: Record<string, PromptHandler>;
  getAvailableTools: (context?: RequestContext) =>
    | Array<{
        name: string;
        description: string;
        inputSchema: unknown;
      }>
    | Promise<
        Array<{
          name: string;
          description: string;
          inputSchema: unknown;
        }>
      >;
  getAvailableResources: (context?: RequestContext) =>
    | Array<{
        uri: string;
        name: string;
        description: string;
        mimeType?: string;
      }>
    | Promise<
        Array<{
          uri: string;
          name: string;
          description: string;
          mimeType?: string;
        }>
      >;
  getAvailablePrompts: (context?: RequestContext) =>
    | Array<{
        name: string;
        description: string;
      }>
    | Promise<
        Array<{
          name: string;
          description: string;
        }>
      >;
}): McpHandlerRegistry {
  return {
    async resolveToolHandler(toolName: string, _context?: RequestContext) {
      return handlers.toolHandlers[toolName];
    },
    async resolveResourceHandler(uri: string, _context?: RequestContext) {
      return handlers.resourceHandlers[uri];
    },
    async resolvePromptHandler(promptName: string, _context?: RequestContext) {
      return handlers.promptHandlers[promptName];
    },
    async getAvailableTools(context?: RequestContext) {
      return normalizeToAsync(handlers.getAvailableTools(context));
    },
    async getAvailableResources(context?: RequestContext) {
      return normalizeToAsync(handlers.getAvailableResources(context));
    },
    async getAvailablePrompts(context?: RequestContext) {
      return normalizeToAsync(handlers.getAvailablePrompts(context));
    },
  };
}

/**
 * Create handler registry from dynamic handlers with fallback
 */
function createDynamicHandlerRegistry(
  dynamicHandlers?: DynamicHandlerRegistry,
  fallbackHandlers?: {
    toolHandlers: Record<string, ToolHandler>;
    resourceHandlers: Record<string, ResourceHandler>;
    promptHandlers: Record<string, PromptHandler>;
  },
  customGetters?: {
    getAvailableTools: (context?: RequestContext) => Promise<
      Array<{
        name: string;
        description: string;
        inputSchema: unknown;
      }>
    >;
    getAvailableResources: (context?: RequestContext) => Promise<
      Array<{
        uri: string;
        name: string;
        description: string;
        mimeType?: string;
      }>
    >;
    getAvailablePrompts: (context?: RequestContext) => Promise<
      Array<{
        name: string;
        description: string;
      }>
    >;
  }
): McpHandlerRegistry {
  return {
    async resolveToolHandler(toolName: string, context?: RequestContext) {
      // Try dynamic handler first
      if (dynamicHandlers) {
        const handler = await dynamicHandlers.getToolHandler(toolName, context);
        if (handler) return handler;
      }
      // Fallback to static handler
      return fallbackHandlers?.toolHandlers[toolName];
    },
    async resolveResourceHandler(uri: string, context?: RequestContext) {
      // Try dynamic handler first
      if (dynamicHandlers) {
        const handler = await dynamicHandlers.getResourceHandler(uri, context);
        if (handler) return handler;
      }
      // Fallback to static handler
      return fallbackHandlers?.resourceHandlers[uri];
    },
    async resolvePromptHandler(promptName: string, context?: RequestContext) {
      // Try dynamic handler first
      if (dynamicHandlers) {
        const handler = await dynamicHandlers.getPromptHandler(
          promptName,
          context
        );
        if (handler) return handler;
      }
      // Fallback to static handler
      return fallbackHandlers?.promptHandlers[promptName];
    },
    async getAvailableTools(context?: RequestContext) {
      // Use custom getters if provided (enhanced server case)
      if (customGetters) {
        return customGetters.getAvailableTools(context);
      }

      // Otherwise combine dynamic and static
      const dynamicTools = dynamicHandlers
        ? await dynamicHandlers.getAvailableTools(context)
        : [];
      const staticTools = fallbackHandlers
        ? Object.keys(fallbackHandlers.toolHandlers).map((name) => ({
            name,
            description: `Static tool: ${name}`,
            inputSchema: {},
          }))
        : [];

      return [...dynamicTools, ...staticTools];
    },
    async getAvailableResources(context?: RequestContext) {
      // Use custom getters if provided (enhanced server case)
      if (customGetters) {
        return customGetters.getAvailableResources(context);
      }

      // Otherwise combine dynamic and static
      const dynamicResources = dynamicHandlers
        ? await dynamicHandlers.getAvailableResources(context)
        : [];
      const staticResources = fallbackHandlers
        ? Object.keys(fallbackHandlers.resourceHandlers).map((uri) => ({
            uri,
            name: `Static resource: ${uri}`,
            description: `Static resource: ${uri}`,
          }))
        : [];

      return [...dynamicResources, ...staticResources];
    },
    async getAvailablePrompts(context?: RequestContext) {
      // Use custom getters if provided (enhanced server case)
      if (customGetters) {
        return customGetters.getAvailablePrompts(context);
      }

      // Otherwise combine dynamic and static
      const dynamicPrompts = dynamicHandlers
        ? await dynamicHandlers.getAvailablePrompts(context)
        : [];
      const staticPrompts = fallbackHandlers
        ? Object.keys(fallbackHandlers.promptHandlers).map((name) => ({
            name,
            description: `Static prompt: ${name}`,
          }))
        : [];

      return [...dynamicPrompts, ...staticPrompts];
    },
  };
}

/**
 * Unified MCP request router - handles all MCP protocol methods
 */
async function routeMcpRequest(
  method: string,
  params: unknown,
  id: string | number | undefined,
  requestContext: RequestContext | undefined,
  registry: McpHandlerRegistry
): Promise<MCPJsonRpcResponse> {
  const DEFAULT_PARAMS: Record<string, unknown> = {};

  switch (method) {
    case "tools/call": {
      const toolParams = params as
        | { name?: string; arguments?: Record<string, unknown> }
        | undefined;
      const toolName = toolParams?.name;

      if (!toolName || typeof toolName !== "string") {
        return createMethodNotFoundErrorResponse(
          `Tool not found: ${toolName}`,
          id
        );
      }

      const handler = await registry.resolveToolHandler(
        toolName,
        requestContext
      );
      if (!handler) {
        return createMethodNotFoundErrorResponse(
          `Tool not found: ${toolName}`,
          id
        );
      }

      const result = await handler(
        toolParams?.arguments || DEFAULT_PARAMS,
        requestContext
      );
      return { jsonrpc: "2.0", id, result };
    }

    case "resources/read": {
      const resourceParams = params as { uri?: string } | undefined;
      const uri = resourceParams?.uri;

      if (!uri || typeof uri !== "string") {
        return createMethodNotFoundErrorResponse(
          `Resource not found: ${uri}`,
          id
        );
      }

      const handler = await registry.resolveResourceHandler(
        uri,
        requestContext
      );
      if (!handler) {
        return createMethodNotFoundErrorResponse(
          `Resource not found: ${uri}`,
          id
        );
      }

      const result = await handler(uri, requestContext);
      return { jsonrpc: "2.0", id, result };
    }

    case "prompts/get": {
      const promptParams = params as
        | { name?: string; arguments?: Record<string, unknown> }
        | undefined;
      const name = promptParams?.name;

      if (!name || typeof name !== "string") {
        return createMethodNotFoundErrorResponse(
          `Prompt not found: ${name}`,
          id
        );
      }

      const handler = await registry.resolvePromptHandler(name, requestContext);
      if (!handler) {
        return createMethodNotFoundErrorResponse(
          `Prompt not found: ${name}`,
          id
        );
      }

      const result = await handler(
        promptParams?.arguments || DEFAULT_PARAMS,
        requestContext
      );
      return { jsonrpc: "2.0", id, result };
    }

    case "tools/list": {
      const tools = await registry.getAvailableTools(requestContext);
      return {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
    }

    case "resources/list": {
      const resources = await registry.getAvailableResources(requestContext);
      return {
        jsonrpc: "2.0",
        id,
        result: { resources },
      };
    }

    case "prompts/list": {
      const prompts = await registry.getAvailablePrompts(requestContext);
      return {
        jsonrpc: "2.0",
        id,
        result: { prompts },
      };
    }

    default: {
      return createMethodNotFoundErrorResponse(method, id);
    }
  }
}

// ============================================================================
// EXPORT CONSOLIDATED API
// ============================================================================

export {
  routeMcpRequest,
  createStaticHandlerRegistry,
  createDynamicHandlerRegistry,
  type McpHandlerRegistry,
};
