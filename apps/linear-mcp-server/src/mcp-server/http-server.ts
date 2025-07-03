import cors from "@fastify/cors";
import { LinearClient } from "@linear/sdk";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { MCPRequest, MCPResponse, MCPErrorResponse } from "@mcp/schemas";
import { createMcpLogger } from "@mcp/utils";
import type { LinearServerConfig } from "../config/config.js";
import {
  createPromptHandlers,
  getAvailablePrompts,
} from "./prompts-registry.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// MCP protocol types now imported from @mcp/schemas

// Default empty parameters object
const DEFAULT_PARAMS: Record<string, unknown> = {};

function createHttpServer(config: LinearServerConfig): FastifyInstance {
  const logger = createMcpLogger({
    serverName: "linear-http-server",
    logLevel: config.logLevel,
    environment: config.env,
  });

  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  // Create handler registries
  const toolHandlers = createToolHandlers(linearClient);
  const resourceHandlers = createResourceHandlers(linearClient);
  const promptHandlers = createPromptHandlers();

  const server = fastify({ logger: false }); // Disable default logger to use our own

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

  // Main MCP endpoint - handles tools, resources, and prompts
  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as MCPRequest;

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
      // Handle different MCP methods
      switch (method) {
        case "tools/call": {
          const toolName = params?.name;
          const handler =
            toolName && typeof toolName === "string"
              ? toolHandlers[toolName]
              : undefined;

          if (!handler || !toolName) {
            const errorResponse: MCPErrorResponse = {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Tool not found: ${toolName}`,
              },
            };
            reply.status(404).send(errorResponse);
            return;
          }

          const result = await handler(
            (params?.arguments as Record<string, unknown>) || DEFAULT_PARAMS
          );
          const response: MCPResponse = { jsonrpc: "2.0", id, result };
          return response;
        }

        case "resources/read": {
          const uri = params?.uri;
          const handler =
            uri && typeof uri === "string" ? resourceHandlers[uri] : undefined;

          if (!handler || !uri) {
            const errorResponse: MCPErrorResponse = {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Resource not found: ${uri}`,
              },
            };
            reply.status(404).send(errorResponse);
            return;
          }

          const result = await handler(uri as string);
          const response: MCPResponse = { jsonrpc: "2.0", id, result };
          return response;
        }

        case "prompts/get": {
          const name = params?.name;
          const handler =
            name && typeof name === "string" ? promptHandlers[name] : undefined;

          if (!handler || !name) {
            const errorResponse: MCPErrorResponse = {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Prompt not found: ${name}`,
              },
            };
            reply.status(404).send(errorResponse);
            return;
          }

          const result = await handler(
            (params?.arguments as Record<string, unknown>) || DEFAULT_PARAMS
          );
          const response: MCPResponse = { jsonrpc: "2.0", id, result };
          return response;
        }

        case "tools/list": {
          const tools = getAvailableTools();
          const response: MCPResponse = {
            jsonrpc: "2.0",
            id,
            result: { tools },
          };
          return response;
        }

        case "resources/list": {
          const resources = getAvailableResources();
          const response: MCPResponse = {
            jsonrpc: "2.0",
            id,
            result: { resources },
          };
          return response;
        }

        case "prompts/list": {
          const prompts = getAvailablePrompts();
          const response: MCPResponse = {
            jsonrpc: "2.0",
            id,
            result: { prompts },
          };
          return response;
        }

        default: {
          const errorResponse: MCPErrorResponse = {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
          reply.status(404).send(errorResponse);
          return;
        }
      }
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

export async function startHttpServer(config: LinearServerConfig) {
  const server = createHttpServer(config);
  const { port, host } = config;

  const logger = createMcpLogger({
    serverName: "linear-http-server",
    logLevel: config.logLevel,
    environment: config.env,
  });

  try {
    await server.listen({ port, host });
    logger.info(`🚀 Linear MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error starting server";
    logger.error("Error starting server", new Error(errorMessage));
    process.exit(1);
  }
}
