#!/usr/bin/env node

import { IncomingHttpHeaders } from "http";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import {
  MCPRouteGeneric,
  HealthRouteGeneric,
  WebSocketRouteGeneric,
  MCPRequestSchema,
  HealthCheckResponseSchema,
  ErrorResponseSchema,
  HTTPHeaders,
} from "@mcp/schemas";
import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { gatewayConfig } from "./config.js";
import { MCPGateway } from "./gateway/mcp-gateway.js";
import {
  registerSecurityMiddleware,
  generateSecureApiKey,
} from "./middleware/security.js";

// Helper function to convert Fastify headers to our HTTPHeaders type
function convertHeaders(fastifyHeaders: IncomingHttpHeaders): HTTPHeaders {
  const headers: HTTPHeaders = {};

  for (const [key, value] of Object.entries(fastifyHeaders)) {
    if (typeof value === "string") {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      // Take the first value for array headers
      headers[key] = value[0];
    } else if (value !== undefined) {
      headers[key] = String(value);
    }
  }

  return headers;
}

// Initialize MCP-compliant logger
const logger = createMcpLogger({
  serverName: "mcp-gateway",
  logLevel: gatewayConfig.env,
  environment: gatewayConfig.env,
});

// Setup global error handlers
setupGlobalErrorHandlers(logger);

let serverInstance: FastifyInstance | null = null;

async function createServer(): Promise<FastifyInstance> {
  if (serverInstance) {
    return serverInstance;
  }

  logger.serverStartup(gatewayConfig.port, {
    service: "mcp-gateway",
    environment: gatewayConfig.env,
  });

  try {
    logger.info("Starting MCP Gateway...");

    // Initialize the MCP Gateway
    const mcpGateway = new MCPGateway(gatewayConfig, logger);
    await mcpGateway.initialize();

    // Create Fastify server with proper TypeScript configuration
    const server: FastifyInstance = fastify({
      logger: false,
      bodyLimit: gatewayConfig.maxRequestSizeMb * 1024 * 1024,
      ajv: {
        customOptions: {
          strict: false,
          coerceTypes: true,
        },
      },
    });

    // Register Security Middleware (must be first)
    await registerSecurityMiddleware(server, {
      logger,
      enableRateLimit: gatewayConfig.enableRateLimit,
      rateLimitPerMinute: gatewayConfig.rateLimitPerMinute,
      requireApiKey: gatewayConfig.requireApiKey,
      apiKey: gatewayConfig.mcpApiKey,
      maxRequestSizeMb: gatewayConfig.maxRequestSizeMb,
      allowedOrigins: gatewayConfig.allowedOrigins,
      corsCredentials: gatewayConfig.corsCredentials,
      securityHeaders: gatewayConfig.securityHeaders,
    });

    // CORS Middleware
    server.register(cors, {
      origin: gatewayConfig.allowedOrigins,
      credentials: gatewayConfig.corsCredentials,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    });

    // WebSocket Support
    server.register(websocket);

    // Health check endpoint with proper typing and schema
    server.get<HealthRouteGeneric>(
      "/health",
      {
        schema: {
          response: {
            200: HealthCheckResponseSchema,
          },
        },
      },
      async (
        request: FastifyRequest<HealthRouteGeneric>,
        reply: FastifyReply
      ) => {
        const status = mcpGateway.getHealthStatus();
        const response = {
          status: "healthy" as const,
          timestamp: new Date().toISOString(),
          servers: status,
        };

        return reply.send(response);
      }
    );

    // MCP HTTP/JSON-RPC endpoint with proper typing and schema validation
    server.post<MCPRouteGeneric>(
      "/mcp",
      {
        schema: {
          body: MCPRequestSchema,
          response: {
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
          },
        },
      },
      async (request: FastifyRequest<MCPRouteGeneric>, reply: FastifyReply) => {
        try {
          const response = await mcpGateway.handleHttpRequest(
            request.body,
            convertHeaders(request.headers)
          );
          return reply.send(response);
        } catch (error) {
          logger.error("HTTP request error", error as Error);
          return reply.status(500).send({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    // WebSocket support for real-time MCP communication
    server.get<WebSocketRouteGeneric>(
      "/mcp/ws",
      {
        websocket: true,
        schema: {
          querystring: {
            type: "object",
            properties: {
              token: { type: "string" },
            },
            additionalProperties: false,
          },
        },
      },
      (connection, request: FastifyRequest<WebSocketRouteGeneric>) => {
        logger.info("New WebSocket connection established", {
          query: request.query,
          headers: request.headers,
        });
        mcpGateway.handleWebSocketConnection(connection);
      }
    );

    // Global error handler with proper typing
    server.setErrorHandler((error, request, reply) => {
      logger.error("Fastify error handler", error, {
        url: request.url,
        method: request.method,
        statusCode: error.statusCode,
      });

      // Handle validation errors
      if (error.validation) {
        return reply.status(400).send({
          error: "Validation failed",
          message: "Request does not match expected schema",
          details: error.validation,
        });
      }

      // Handle other errors
      const statusCode = error.statusCode || 500;
      return reply.status(statusCode).send({
        error: statusCode >= 500 ? "Internal server error" : "Bad request",
        message: error.message || "An unexpected error occurred",
      });
    });

    // Graceful shutdown with proper cleanup
    const close = async () => {
      logger.info("Initiating graceful shutdown...");
      await mcpGateway.shutdown();
      await server.close();
      logger.info("Gateway shutdown complete");
    };

    process.on("SIGINT", async () => {
      logger.serverShutdown({ signal: "SIGINT" });
      await close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.serverShutdown({ signal: "SIGTERM" });
      await close();
      process.exit(0);
    });

    serverInstance = server;
    return server;
  } catch (error) {
    logger.error("Failed to initialize MCP Gateway", error as Error);
    process.exit(1);
  }
}

async function start() {
  try {
    const server = await createServer();
    await server.listen({
      port: gatewayConfig.port,
      host: gatewayConfig.host,
    });

    logger.info(
      `🚀 MCP Gateway listening on ${gatewayConfig.host}:${gatewayConfig.port}`
    );
    logger.info(
      `📋 Health check: http://${gatewayConfig.host}:${gatewayConfig.port}/health`
    );
    logger.info(
      `🔌 MCP endpoint: http://${gatewayConfig.host}:${gatewayConfig.port}/mcp`
    );
    logger.info(
      `🌐 WebSocket: ws://${gatewayConfig.host}:${gatewayConfig.port}/mcp/ws`
    );

    if (gatewayConfig.env === "development") {
      logger.info(`🔑 Development API key: ${generateSecureApiKey()}`);
    }
  } catch (error) {
    logger.error("Failed to start MCP Gateway", error as Error);
    process.exit(1);
  }
}

// Auto-start if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createServer };
