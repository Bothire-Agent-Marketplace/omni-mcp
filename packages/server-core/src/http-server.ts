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
  ToolHandler,
  ResourceHandler,
  PromptHandler,
} from "./config.js";

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

    try {
      // Route to appropriate handler based on method
      const response = await routeRequest(method, params, id, {
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
  handlers: {
    toolHandlers: Record<string, ToolHandler>;
    resourceHandlers: Record<string, ResourceHandler>;
    promptHandlers: Record<string, PromptHandler>;
    getAvailableTools: () => Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>;
    getAvailableResources: () => Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }>;
    getAvailablePrompts: () => Array<{ name: string; description: string }>;
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

      const result = await handler(toolParams?.arguments || DEFAULT_PARAMS);
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

      const result = await handler(uri);
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

      const result = await handler(promptParams?.arguments || DEFAULT_PARAMS);
      return { jsonrpc: "2.0", id, result };
    }

    case "tools/list": {
      const tools = handlers.getAvailableTools();
      return {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
    }

    case "resources/list": {
      const resources = handlers.getAvailableResources();
      return {
        jsonrpc: "2.0",
        id,
        result: { resources },
      };
    }

    case "prompts/list": {
      const prompts = handlers.getAvailablePrompts();
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
