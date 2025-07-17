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
import { getGatewayConfig } from "./config.js";
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

let serverInstance: FastifyInstance | null = null;

// Store SSE connections
const sseConnections = new Map<string, FastifyReply>();

async function createServer(): Promise<FastifyInstance> {
  if (serverInstance) {
    return serverInstance;
  }

  // Load gateway configuration
  const gatewayConfig = await getGatewayConfig();

  // Initialize logger
  const logger = createMcpLogger({
    serverName: "mcp-gateway",
    logLevel: gatewayConfig.env === "production" ? "info" : "debug",
    environment: gatewayConfig.env,
  });

  // Setup global error handlers
  setupGlobalErrorHandlers(logger);

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

    // SSE endpoint for mcp-bridge compatibility
    server.get("/sse", async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = Math.random().toString(36).substr(2, 9);

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Store the connection
      sseConnections.set(sessionId, reply);

      // Send initial connection event
      reply.raw.write(
        `data: ${JSON.stringify({
          type: "connection",
          sessionId: sessionId,
        })}\n\n`
      );

      // Handle client disconnect
      request.raw.on("close", () => {
        sseConnections.delete(sessionId);
        logger.info(`SSE connection closed: ${sessionId}`);
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        if (reply.raw.destroyed) {
          clearInterval(keepAlive);
          sseConnections.delete(sessionId);
          return;
        }
        reply.raw.write(": keep-alive\n\n");
      }, 30000);

      logger.info(`SSE connection established: ${sessionId}`);
    });

    // Messages endpoint for mcp-bridge compatibility
    server.post(
      "/messages",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          logger.info("Received message via /messages endpoint", {
            body: request.body,
          });

          // Process the MCP request through the gateway
          const response = await mcpGateway.handleHttpRequest(
            request.body,
            convertHeaders(request.headers)
          );

          // Send response back immediately for synchronous requests
          return reply.send(response);
        } catch (error) {
          logger.error("Messages endpoint error", error as Error);
          return reply.status(500).send({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
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
        errorCode: error.code,
        errorName: error.name,
        validation: error.validation,
        validationContext: error.validationContext,
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
      // Close all SSE connections
      for (const [_sessionId, reply] of sseConnections.entries()) {
        if (!reply.raw.destroyed) {
          reply.raw.end();
        }
      }
      sseConnections.clear();
      await mcpGateway.shutdown();
      await server.close();
      logger.info("Gateway shutdown complete");
    };

    // Handle shutdown signals
    process.on("SIGINT", close);
    process.on("SIGTERM", close);

    serverInstance = server;
    return server;
  } catch (error) {
    logger.error("Failed to create server", error as Error);
    throw error;
  }
}

async function start() {
  try {
    // Load gateway configuration
    const gatewayConfig = await getGatewayConfig();

    // Initialize logger for startup
    const logger = createMcpLogger({
      serverName: "mcp-gateway",
      logLevel: gatewayConfig.env === "production" ? "info" : "debug",
      environment: gatewayConfig.env,
    });

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
      `📡 SSE endpoint: http://${gatewayConfig.host}:${gatewayConfig.port}/sse`
    );
    logger.info(
      `📨 Messages endpoint: http://${gatewayConfig.host}:${gatewayConfig.port}/messages`
    );
    logger.info(
      `🌐 WebSocket: ws://${gatewayConfig.host}:${gatewayConfig.port}/mcp/ws`
    );

    if (gatewayConfig.env === "development") {
      logger.info(`🔑 Development API key: ${gatewayConfig.mcpApiKey}`);
    }
  } catch (error) {
    // Create a basic logger for error reporting if config loading fails
    const logger = createMcpLogger({
      serverName: "mcp-gateway",
      logLevel: "error",
      environment: "development",
    });
    logger.error("Failed to start MCP Gateway", error as Error);
    process.exit(1);
  }
}

// Export for testing
export { createServer };

// Start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
