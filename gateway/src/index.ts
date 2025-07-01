#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { MCPGateway } from "./gateway/mcp-gateway.js";
import {
  createMcpLogger,
  setupGlobalErrorHandlers,
  envConfig,
} from "@mcp/utils";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

    // Create Express app
    const app = express();

    // Middleware
    app.use(
      cors({
        origin: config.gateway.allowedOrigins,
        credentials: true,
      })
    );
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (req, res) => {
      const status = mcpGateway.getHealthStatus();
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        servers: status,
      });
    });

    // MCP HTTP/JSON-RPC endpoint
    app.post("/mcp", async (req, res) => {
      try {
        const response = await mcpGateway.handleHttpRequest(
          req.body,
          req.headers
        );
        res.json(response);
      } catch (error) {
        logger.error("HTTP request error", error as Error);
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Create HTTP server
    const server = createServer(app);

    // Add WebSocket support for SSE-like functionality
    const wss = new WebSocketServer({ server, path: "/mcp/ws" });

    wss.on("connection", (ws) => {
      logger.info("New WebSocket connection established");
      mcpGateway.handleWebSocketConnection(ws);
    });

    // Start server
    const port = envConfig.GATEWAY_PORT;
    server.listen(port, envConfig.GATEWAY_HOST, () => {
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
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.serverShutdown({ signal: "SIGINT" });
      await mcpGateway.shutdown();
      server.close(() => {
        process.exit(0);
      });
    });

    process.on("SIGTERM", async () => {
      logger.serverShutdown({ signal: "SIGTERM" });
      await mcpGateway.shutdown();
      server.close(() => {
        process.exit(0);
      });
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
