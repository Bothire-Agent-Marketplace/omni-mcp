#!/usr/bin/env node

import fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { MCPGateway } from "./gateway/mcp-gateway.js";
import {
  createMcpLogger,
  setupGlobalErrorHandlers,
  envConfig,
} from "@mcp/utils";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize MCP-compliant logger
const logger = createMcpLogger("mcp-gateway");

// Setup global error handlers
setupGlobalErrorHandlers(logger);

async function main() {
  logger.serverStartup(envConfig.GATEWAY_PORT, {
    service: "mcp-gateway",
    environment: envConfig.NODE_ENV,
  });

  try {
    // Load configuration
    const configFile =
      process.env.NODE_ENV === "development"
        ? "../master.config.dev.json"
        : "../master.config.json";
    const configPath = join(__dirname, configFile);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    logger.info("Starting MCP Gateway...");

    // Initialize the MCP Gateway
    const mcpGateway = new MCPGateway(config);
    await mcpGateway.initialize();

    // Create Fastify server
    const server: FastifyInstance = fastify({ logger: false });

    // Middleware
    server.register(cors, {
      origin: config.gateway.allowedOrigins,
      credentials: true,
    });
    server.register(websocket);

    // Health check endpoint
    server.get("/health", async (request, reply) => {
      const status = mcpGateway.getHealthStatus();
      reply.send({
        status: "healthy",
        timestamp: new Date().toISOString(),
        servers: status,
      });
    });

    // MCP HTTP/JSON-RPC endpoint
    server.post("/mcp", async (request, reply) => {
      try {
        const response = await mcpGateway.handleHttpRequest(
          request.body,
          request.headers
        );
        reply.send(response);
      } catch (error) {
        logger.error("HTTP request error", error as Error);
        reply.status(500).send({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Add WebSocket support for SSE-like functionality
    server.get("/mcp/ws", { websocket: true }, (connection, req) => {
      logger.info("New WebSocket connection established");
      mcpGateway.handleWebSocketConnection(connection);
    });

    // Start server
    const port = envConfig.GATEWAY_PORT;
    await server.listen({ port, host: envConfig.GATEWAY_HOST });

    logger.serverReady({
      port,
      host: envConfig.GATEWAY_HOST,
      endpoints: ["/health", "/mcp", "/mcp/ws"],
    });

    logger.info(`🚀 MCP Gateway running on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 HTTP MCP endpoint: http://localhost:${port}/mcp`);
    logger.info(`🌐 WebSocket MCP endpoint: ws://localhost:${port}/mcp/ws`);
    logger.info("\n📡 Active MCP servers:");

    Object.entries(config.servers).forEach(
      ([name, serverConfig]: [string, any]) => {
        logger.info(`   ${name}: ${serverConfig.capabilities.join(", ")}`);
      }
    );

    // Graceful shutdown
    const close = async () => {
      await mcpGateway.shutdown();
      await server.close();
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
  } catch (error) {
    logger.error("Failed to start MCP Gateway", error as Error);
    process.exit(1);
  }
}

// Start the gateway
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error("Gateway startup failed", error);
    process.exit(1);
  });
}
