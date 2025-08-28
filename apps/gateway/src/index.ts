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
  HTTPHeaders,
  MCPJsonRpcResponseSchema,
  createInternalErrorResponse,
} from "@mcp/schemas";
import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { getGatewayConfig } from "./config.js";
import { MCPGateway } from "./gateway/mcp-gateway.js";
import { registerSecurityMiddleware } from "./middleware/security.js";

function convertHeaders(fastifyHeaders: IncomingHttpHeaders): HTTPHeaders {
  const headers: HTTPHeaders = {};

  for (const [key, value] of Object.entries(fastifyHeaders)) {
    if (typeof value === "string") {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value[0];
    } else if (value !== undefined) {
      headers[key] = String(value);
    }
  }

  return headers;
}

function extractApiKeyFromRequest(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const apiKeyHeader = request.headers["x-api-key"];
  if (apiKeyHeader && typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }

  const query = request.query as Record<string, unknown> | undefined;
  const apiKeyQuery =
    query && typeof query["api_key"] === "string"
      ? (query["api_key"] as string)
      : null;
  if (apiKeyQuery) {
    return apiKeyQuery;
  }

  return null;
}

function isValidApiKey(providedKey: string, configuredKey: string): boolean {
  if (!configuredKey || providedKey.length !== configuredKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedKey.length; i++) {
    result |= providedKey.charCodeAt(i) ^ configuredKey.charCodeAt(i);
  }
  return result === 0;
}

let serverInstance: FastifyInstance | null = null;

const sseConnections = new Map<string, FastifyReply>();

async function createServer(): Promise<FastifyInstance> {
  if (serverInstance) {
    return serverInstance;
  }

  const gatewayConfig = await getGatewayConfig();

  const logger = createMcpLogger({
    serverName: "mcp-gateway",
    logLevel: gatewayConfig.env === "production" ? "info" : "debug",
    environment: gatewayConfig.env,
  });

  setupGlobalErrorHandlers(logger);

  logger.serverStartup(gatewayConfig.port, {
    service: "mcp-gateway",
    environment: gatewayConfig.env,
  });

  try {
    logger.info("Starting MCP Gateway...");

    const mcpGateway = new MCPGateway(gatewayConfig, logger);
    await mcpGateway.initialize();

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

    server.register(cors, {
      origin: gatewayConfig.allowedOrigins,
      credentials: gatewayConfig.corsCredentials,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    });

    server.register(websocket);

    server.get<HealthRouteGeneric>(
      "/health",
      {
        schema: {
          response: {
            200: {},
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

    server.get("/sse", async (request: FastifyRequest, reply: FastifyReply) => {
      // Enforce API key on SSE
      const providedKey = extractApiKeyFromRequest(request);
      if (
        !providedKey ||
        !isValidApiKey(providedKey, gatewayConfig.mcpApiKey)
      ) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: "Valid API key required" });
      }

      const sessionId = Math.random().toString(36).substr(2, 9);

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      sseConnections.set(sessionId, reply);

      reply.raw.write(
        `data: ${JSON.stringify({
          type: "connection",
          sessionId: sessionId,
        })}\n\n`
      );

      request.raw.on("close", () => {
        sseConnections.delete(sessionId);
        logger.info(`SSE connection closed: ${sessionId}`);
      });

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

    server.post(
      "/messages",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          logger.info("Received message via /messages endpoint");

          const response = await mcpGateway.handleHttpRequest(
            request.body,
            convertHeaders(request.headers)
          );

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

    server.post<MCPRouteGeneric>(
      "/mcp",
      {
        schema: {
          body: {
            type: "object",
            properties: {
              jsonrpc: { type: "string", enum: ["2.0"] },
              method: { type: "string", minLength: 1 },
              params: {
                type: "object",
                additionalProperties: true,
              },
              id: {
                type: ["string", "number", "null"],
              },
            },
            required: ["jsonrpc", "method"],
            additionalProperties: false,
          },
          // Note: Response schema enforced via runtime validation
        },
      },
      async (request: FastifyRequest<MCPRouteGeneric>, reply: FastifyReply) => {
        try {
          const response = await mcpGateway.handleHttpRequest(
            request.body,
            convertHeaders(request.headers)
          );
          const parsed = MCPJsonRpcResponseSchema.safeParse(response);
          if (!parsed.success) {
            logger.error("Invalid JSON-RPC response schema", undefined, {
              validationErrors: parsed.error.issues,
            });
            const err = createInternalErrorResponse(
              "Response validation failed",
              (request.body as { id?: string | number | null })?.id
            );
            return reply.status(500).send(err);
          }
          return reply.send(parsed.data);
        } catch (error) {
          logger.error("HTTP request error", error as Error);
          return reply.status(500).send({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

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
        const providedKey = extractApiKeyFromRequest(request);
        if (
          !providedKey ||
          !isValidApiKey(providedKey, gatewayConfig.mcpApiKey)
        ) {
          try {
            connection.socket.close(1008, "Unauthorized");
          } catch {}
          return;
        }

        logger.info("New WebSocket connection established");
        mcpGateway.handleWebSocketConnection(connection);
      }
    );

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

      if (error.validation) {
        return reply.status(400).send({
          error: "Validation failed",
          message: "Request does not match expected schema",
          details: error.validation,
        });
      }

      const statusCode = error.statusCode || 500;
      return reply.status(statusCode).send({
        error: statusCode >= 500 ? "Internal server error" : "Bad request",
        message: error.message || "An unexpected error occurred",
      });
    });

    const close = async () => {
      logger.info("Initiating graceful shutdown...");
      for (const reply of sseConnections.values()) {
        if (!reply.raw.destroyed) {
          reply.raw.end();
        }
      }
      sseConnections.clear();
      await mcpGateway.shutdown();
      await server.close();
      logger.info("Gateway shutdown complete");
    };

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
    const gatewayConfig = await getGatewayConfig();

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
    const logger = createMcpLogger({
      serverName: "mcp-gateway",
      logLevel: "error",
      environment: "development",
    });
    logger.error("Failed to start MCP Gateway", error as Error);
    process.exit(1);
  }
}

export { createServer };

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
