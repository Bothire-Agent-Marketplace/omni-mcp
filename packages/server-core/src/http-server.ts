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

/**
 * Extract organization context from request headers
 */
function extractOrganizationContext(
  request: FastifyRequest
): RequestContext | undefined {
  const orgId = request.headers["x-organization-id"] as string;
  const orgClerkId = request.headers["x-organization-clerk-id"] as string;
  const orgName = request.headers["x-organization-name"] as string;
  const orgSlug = request.headers["x-organization-slug"] as string;
  const userId = request.headers["x-user-id"] as string;
  const requestId = request.headers["x-request-id"] as string;

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

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);

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
    } catch {}
  }

  return undefined;
}

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

  const server = fastify({ logger: false });

  server.register(cors);

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

  server.get("/health", async () => {
    return { status: "ok" };
  });

  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as MCPJsonRpcRequest;

    if (jsonrpc !== "2.0") {
      reply.status(400).send(createInvalidRequestErrorResponse(id));
      return;
    }

    const requestContext = extractOrganizationContext(request);

    try {
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
      if (error instanceof ZodError) {
        const validationErrors = error.format()._errors.join(", ");

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

  let finalDynamicHandlers = dynamicHandlers;
  if (serverKey && !dynamicHandlers) {
    const { getServerRegistry } = require("./server-registry.js");
    const { DatabaseDynamicHandlerRegistry } = require("./dynamic-handlers.js");
    const { ConfigLoader } = require("@mcp/config-service");

    const serverRegistry = getServerRegistry(logger);
    const configLoader = new ConfigLoader();

    const setupDynamicHandlers = async () => {
      const serverId = await serverRegistry.getServerId(serverKey);
      return new DatabaseDynamicHandlerRegistry(serverId, configLoader);
    };

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

  const server = fastify({ logger: false });

  server.register(cors);

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

  server.get("/health", async () => {
    return { status: "ok" };
  });

  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { method, params, id, jsonrpc } = request.body as MCPJsonRpcRequest;

    if (jsonrpc !== "2.0") {
      reply.status(400).send(createInvalidRequestErrorResponse(id));
      return;
    }

    const requestContext = extractOrganizationContext(request);

    try {
      const registry = assembleMcpHandlerRegistry(
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
      if (error instanceof ZodError) {
        const validationErrors = error.format()._errors.join(", ");

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

interface McpHandlerRegistry {
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
function assembleMcpHandlerRegistry(
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
      const dynamicHandler = await dynamicHandlers?.getToolHandler?.(
        toolName,
        context
      );
      if (dynamicHandler) {
        return dynamicHandler;
      }

      return fallbackHandlers?.toolHandlers?.[toolName];
    },

    async resolveResourceHandler(uri: string, context?: RequestContext) {
      const dynamicHandler = await dynamicHandlers?.getResourceHandler?.(
        uri,
        context
      );
      if (dynamicHandler) {
        return dynamicHandler;
      }

      return fallbackHandlers?.resourceHandlers?.[uri];
    },

    async resolvePromptHandler(promptName: string, context?: RequestContext) {
      const dynamicHandler = await dynamicHandlers?.getPromptHandler?.(
        promptName,
        context
      );
      if (dynamicHandler) {
        return dynamicHandler;
      }

      return fallbackHandlers?.promptHandlers?.[promptName];
    },

    async getAvailableTools(context?: RequestContext) {
      if (customGetters?.getAvailableTools) {
        return customGetters.getAvailableTools(context);
      }

      const dynamicTools =
        (await dynamicHandlers?.getAvailableTools?.(context)) || [];
      const staticTools = Object.keys(fallbackHandlers?.toolHandlers || {}).map(
        (name) => ({
          name,
          description: "",
          inputSchema: {},
        })
      );
      return [...dynamicTools, ...staticTools];
    },

    async getAvailableResources(context?: RequestContext) {
      if (customGetters?.getAvailableResources) {
        return customGetters.getAvailableResources(context);
      }

      const dynamicResources =
        (await dynamicHandlers?.getAvailableResources?.(context)) || [];
      const staticResources = Object.keys(
        fallbackHandlers?.resourceHandlers || {}
      ).map((uri) => ({
        uri,
        name: uri,
        description: "",
      }));
      return [...dynamicResources, ...staticResources];
    },

    async getAvailablePrompts(context?: RequestContext) {
      if (customGetters?.getAvailablePrompts) {
        return customGetters.getAvailablePrompts(context);
      }

      const dynamicPrompts =
        (await dynamicHandlers?.getAvailablePrompts?.(context)) || [];
      const staticPrompts = Object.keys(
        fallbackHandlers?.promptHandlers || {}
      ).map((name) => ({
        name,
        description: "",
      }));
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

export {
  routeMcpRequest,
  createStaticHandlerRegistry,
  assembleMcpHandlerRegistry,
  type McpHandlerRegistry,
};
