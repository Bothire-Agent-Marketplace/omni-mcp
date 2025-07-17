import cors from "@fastify/cors";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { MCPRequest, MCPResponse, MCPErrorResponse } from "@mcp/schemas";
import { createMcpLogger } from "@mcp/utils";
import type {
  ServerCreationOptions,
  HandlerRegistries,
  EnhancedServerCreationOptions,
  DynamicHandlerRegistry,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  RequestContext,
  OrganizationContext,
} from "./config.js";

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
      clerkId: orgClerkId,
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
          clerkId: payload.org.clerk_id,
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
    const { jsonrpc, method, params, id } = request.body as MCPRequest;

    // Validate JSON-RPC format
    if (jsonrpc !== "2.0") {
      const errorResponse: MCPErrorResponse = {
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      };
      reply.status(400).send(errorResponse);
      return;
    }

    // Extract organization context from request headers
    const requestContext = extractOrganizationContext(request);

    try {
      // Route to appropriate handler based on method
      const response = await routeRequest(method, params, id, requestContext, {
        toolHandlers,
        resourceHandlers,
        promptHandlers,
        getAvailableTools,
        getAvailableResources,
        getAvailablePrompts,
      });

      return response;
    } catch (error: unknown) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const validationErrors = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");

        const errorResponse: MCPErrorResponse = {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params",
            data: `Validation failed: ${validationErrors}`,
          },
        };
        reply.status(400).send(errorResponse);
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorResponse: MCPErrorResponse = {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: "Internal server error",
          data: errorMessage,
        },
      };
      reply.status(500).send(errorResponse);
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
    const { DefaultDynamicHandlerRegistry } = require("./dynamic-handlers.js");
    const { ConfigLoader } = require("@mcp/config-service");

    const serverRegistry = getServerRegistry(logger);
    const configLoader = new ConfigLoader();

    // Create dynamic handlers with server registry lookup
    const setupDynamicHandlers = async () => {
      const serverId = await serverRegistry.getServerId(serverKey);
      return new DefaultDynamicHandlerRegistry(serverId, configLoader);
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
    const { jsonrpc, method, params, id } = request.body as MCPRequest;

    // Validate JSON-RPC format
    if (jsonrpc !== "2.0") {
      const errorResponse: MCPErrorResponse = {
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      };
      reply.status(400).send(errorResponse);
      return;
    }

    // Extract organization context from request headers
    const requestContext = extractOrganizationContext(request);

    try {
      // Route to appropriate handler based on method
      const response = await routeEnhancedRequest(
        method,
        params,
        id,
        requestContext,
        {
          dynamicHandlers: finalDynamicHandlers,
          fallbackHandlers,
          getAvailableTools,
          getAvailableResources,
          getAvailablePrompts,
        }
      );

      return response;
    } catch (error: unknown) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const validationErrors = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");

        const errorResponse: MCPErrorResponse = {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params",
            data: `Validation failed: ${validationErrors}`,
          },
        };
        reply.status(400).send(errorResponse);
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorResponse: MCPErrorResponse = {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: "Internal server error",
          data: errorMessage,
        },
      };
      reply.status(500).send(errorResponse);
    }
  });

  return server;
}

// ============================================================================
// REQUEST ROUTING
// ============================================================================

/**
 * Routes MCP requests to appropriate handlers
 */
async function routeRequest(
  method: string,
  params: unknown,
  id: string | number | undefined,
  requestContext: RequestContext | undefined,
  handlers: {
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
  }
): Promise<MCPResponse> {
  const DEFAULT_PARAMS: Record<string, unknown> = {};

  switch (method) {
    case "tools/call": {
      const toolParams = params as
        | { name?: string; arguments?: Record<string, unknown> }
        | undefined;
      const toolName = toolParams?.name;
      const handler =
        toolName && typeof toolName === "string"
          ? handlers.toolHandlers[toolName]
          : undefined;

      if (!handler || !toolName) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${toolName}`,
          },
        };
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
      const handler =
        uri && typeof uri === "string"
          ? handlers.resourceHandlers[uri]
          : undefined;

      if (!handler || !uri) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Resource not found: ${uri}`,
          },
        };
      }

      const result = await handler(uri, requestContext);
      return { jsonrpc: "2.0", id, result };
    }

    case "prompts/get": {
      const promptParams = params as
        | { name?: string; arguments?: Record<string, unknown> }
        | undefined;
      const name = promptParams?.name;
      const handler =
        name && typeof name === "string"
          ? handlers.promptHandlers[name]
          : undefined;

      if (!handler || !name) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Prompt not found: ${name}`,
          },
        };
      }

      const result = await handler(
        promptParams?.arguments || DEFAULT_PARAMS,
        requestContext
      );
      return { jsonrpc: "2.0", id, result };
    }

    case "tools/list": {
      const tools = await Promise.resolve(
        handlers.getAvailableTools(requestContext)
      );
      return {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
    }

    case "resources/list": {
      const resources = await Promise.resolve(
        handlers.getAvailableResources(requestContext)
      );
      return {
        jsonrpc: "2.0",
        id,
        result: { resources },
      };
    }

    case "prompts/list": {
      const prompts = await Promise.resolve(
        handlers.getAvailablePrompts(requestContext)
      );
      return {
        jsonrpc: "2.0",
        id,
        result: { prompts },
      };
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }
  }
}

/**
 * Routes enhanced MCP requests to dynamic handlers
 */
async function routeEnhancedRequest(
  method: string,
  params: unknown,
  id: string | number | undefined,
  requestContext: RequestContext | undefined,
  handlers: {
    dynamicHandlers?: DynamicHandlerRegistry;
    fallbackHandlers?: {
      toolHandlers: Record<string, ToolHandler>;
      resourceHandlers: Record<string, ResourceHandler>;
      promptHandlers: Record<string, PromptHandler>;
    };
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
  }
): Promise<MCPResponse> {
  const DEFAULT_PARAMS: Record<string, unknown> = {};

  switch (method) {
    case "tools/call": {
      const toolParams = params as
        | { name?: string; arguments?: Record<string, unknown> }
        | undefined;
      const toolName = toolParams?.name;

      if (!toolName || typeof toolName !== "string") {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${toolName}`,
          },
        };
      }

      // Try dynamic handler first
      let handler: ToolHandler | undefined;
      if (handlers.dynamicHandlers) {
        handler = await handlers.dynamicHandlers.getToolHandler(
          toolName,
          requestContext
        );
      }

      // Fallback to static handler
      if (!handler && handlers.fallbackHandlers) {
        handler = handlers.fallbackHandlers.toolHandlers[toolName];
      }

      if (!handler) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${toolName}`,
          },
        };
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
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Resource not found: ${uri}`,
          },
        };
      }

      // Try dynamic handler first
      let handler: ResourceHandler | undefined;
      if (handlers.dynamicHandlers) {
        handler = await handlers.dynamicHandlers.getResourceHandler(
          uri,
          requestContext
        );
      }

      // Fallback to static handler
      if (!handler && handlers.fallbackHandlers) {
        handler = handlers.fallbackHandlers.resourceHandlers[uri];
      }

      if (!handler) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Resource not found: ${uri}`,
          },
        };
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
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Prompt not found: ${name}`,
          },
        };
      }

      // Try dynamic handler first
      let handler: PromptHandler | undefined;
      if (handlers.dynamicHandlers) {
        handler = await handlers.dynamicHandlers.getPromptHandler(
          name,
          requestContext
        );
      }

      // Fallback to static handler
      if (!handler && handlers.fallbackHandlers) {
        handler = handlers.fallbackHandlers.promptHandlers[name];
      }

      if (!handler) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Prompt not found: ${name}`,
          },
        };
      }

      const result = await handler(
        promptParams?.arguments || DEFAULT_PARAMS,
        requestContext
      );
      return { jsonrpc: "2.0", id, result };
    }

    case "tools/list": {
      const tools = await Promise.resolve(
        handlers.getAvailableTools(requestContext)
      );
      return {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
    }

    case "resources/list": {
      const resources = await Promise.resolve(
        handlers.getAvailableResources(requestContext)
      );
      return {
        jsonrpc: "2.0",
        id,
        result: { resources },
      };
    }

    case "prompts/list": {
      const prompts = await Promise.resolve(
        handlers.getAvailablePrompts(requestContext)
      );
      return {
        jsonrpc: "2.0",
        id,
        result: { prompts },
      };
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }
  }
}
