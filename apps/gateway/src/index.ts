#!/usr/bin/env node

import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastify, { FastifyInstance } from "fastify";
import {
  createMcpLogger,
  setupGlobalErrorHandlers,
  envConfig,
  getMCPServersConfig,
  getGatewayConfig,
} from "@mcp/utils";
import { MCPGateway } from "./gateway/mcp-gateway.js";
import {
  registerSecurityMiddleware,
  generateSecureApiKey,
} from "./middleware/security.js";

// Initialize MCP-compliant logger
const logger = createMcpLogger("mcp-gateway");

// Setup global error handlers
setupGlobalErrorHandlers(logger);

let serverInstance: FastifyInstance | null = null;

async function createServer(): Promise<FastifyInstance> {
  if (serverInstance) {
    return serverInstance;
  }

  logger.serverStartup(envConfig.GATEWAY_PORT, {
    service: "mcp-gateway",
    environment: envConfig.NODE_ENV,
  });

  try {
    // Load configuration from environment
    const servers = getMCPServersConfig(envConfig.NODE_ENV);
    const gateway = getGatewayConfig(envConfig.NODE_ENV);
    const config = { servers, gateway };

    logger.info("Starting MCP Gateway...");

    // Initialize the MCP Gateway
    const mcpGateway = new MCPGateway(config);
    await mcpGateway.initialize();

    // Create Fastify server
    const server: FastifyInstance = fastify({
      logger: false,
      bodyLimit: config.gateway.maxRequestSizeMb * 1024 * 1024,
    });

    // Register Security Middleware (must be first)
    await registerSecurityMiddleware(server, {
      enableRateLimit: config.gateway.enableRateLimit,
      rateLimitPerMinute: config.gateway.rateLimitPerMinute,
      requireApiKey: config.gateway.requireApiKey,
      apiKey: envConfig.MCP_API_KEY,
      maxRequestSizeMb: config.gateway.maxRequestSizeMb,
      allowedOrigins: config.gateway.allowedOrigins,
      corsCredentials: config.gateway.corsCredentials,
      securityHeaders: config.gateway.securityHeaders,
    });

    // CORS Middleware
    server.register(cors, {
      origin: config.gateway.allowedOrigins,
      credentials: config.gateway.corsCredentials,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    });

    // WebSocket Support
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

    serverInstance = server;
    return server;
  } catch (error) {
    logger.error("Failed to initialize MCP Gateway", error as Error);
    process.exit(1);
  }
}

async function main() {
  const server = await createServer();
  const config = {
    servers: getMCPServersConfig(envConfig.NODE_ENV),
    gateway: getGatewayConfig(envConfig.NODE_ENV),
  };

  try {
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

    // Security Information
    if (config.gateway.requireApiKey) {
      logger.info(`🔐 API Key Authentication: ENABLED`);
      if (envConfig.NODE_ENV === "development") {
        logger.info(`🔑 Dev API Key: ${envConfig.MCP_API_KEY}`);
        logger.info(
          `📝 Example request: curl -H "x-api-key: ${envConfig.MCP_API_KEY}" http://localhost:${port}/health`
        );
      }
    } else {
      logger.info(`🔐 API Key Authentication: DISABLED (development mode)`);
    }

    if (config.gateway.enableRateLimit) {
      logger.info(
        `⏱️  Rate Limiting: ${config.gateway.rateLimitPerMinute} requests/minute`
      );
    }

    logger.info("\n📡 Active MCP servers:");
    Object.entries(config.servers).forEach(
      ([name, serverConfig]: [string, any]) => {
        logger.info(`   ${name}: ${serverConfig.capabilities.join(", ")}`);
      }
    );

    // Generate secure API key for production setup
    if (
      envConfig.NODE_ENV === "production" &&
      envConfig.MCP_API_KEY.includes("dev-")
    ) {
      logger.warn("\n🚨 PRODUCTION SECURITY WARNING:");
      logger.warn("   Default API key detected in production!");
      logger.warn(`   Generate a secure key: ${generateSecureApiKey()}`);
      logger.warn("   Set MCP_API_KEY environment variable");
    }
  } catch (error) {
    logger.error("Failed to start MCP Gateway", error as Error);
    process.exit(1);
  }
}

// Start the gateway
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
