import { VercelRequest, VercelResponse } from "@vercel/node";
import fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { MCPGateway } from "../apps/gateway/src/gateway/mcp-gateway.js";
import { registerSecurityMiddleware } from "../apps/gateway/src/middleware/security.js";
import {
  createMcpLogger,
  envConfig,
  getMCPServersConfig,
  getGatewayConfig,
} from "@mcp/utils";

const logger = createMcpLogger("mcp-gateway-vercel");

// Singleton pattern for the gateway to avoid re-initialization
let gatewayInstance: MCPGateway | null = null;
let fastifyApp: any = null;

async function initializeGateway() {
  if (gatewayInstance && fastifyApp) {
    return { gateway: gatewayInstance, app: fastifyApp };
  }

  try {
    logger.info("Initializing MCP Gateway for Vercel...", {
      environment: envConfig.NODE_ENV,
      vercelEnv: envConfig.VERCEL_ENV,
    });

    // Load configuration
    const servers = getMCPServersConfig("production");
    const gatewayConfig = getGatewayConfig("production");
    const config = { servers, gateway: gatewayConfig };

    // Initialize the MCP Gateway
    gatewayInstance = new MCPGateway(config);
    await gatewayInstance.initialize();

    // Create Fastify app for serverless
    fastifyApp = fastify({
      logger: false,
      bodyLimit: config.gateway.maxRequestSizeMb * 1024 * 1024,
    });

    // Register Security Middleware
    await registerSecurityMiddleware(fastifyApp, {
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
    await fastifyApp.register(cors, {
      origin: config.gateway.allowedOrigins,
      credentials: config.gateway.corsCredentials,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    });

    // WebSocket Support (limited in Vercel)
    await fastifyApp.register(websocket);

    // Health check endpoint
    fastifyApp.get("/health", async (request: any, reply: any) => {
      const status = gatewayInstance!.getHealthStatus();
      reply.send({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: "vercel",
        servers: status,
      });
    });

    // MCP HTTP/JSON-RPC endpoint
    fastifyApp.post("/mcp", async (request: any, reply: any) => {
      try {
        const response = await gatewayInstance!.handleHttpRequest(
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

    // Handle WebSocket upgrade (limited support in Vercel)
    fastifyApp.get(
      "/mcp/ws",
      { websocket: true },
      (connection: any, req: any) => {
        logger.info("WebSocket connection attempt (limited support in Vercel)");
        gatewayInstance!.handleWebSocketConnection(connection);
      }
    );

    logger.info("MCP Gateway initialized for Vercel successfully");
    return { gateway: gatewayInstance, app: fastifyApp };
  } catch (error) {
    logger.error("Failed to initialize MCP Gateway for Vercel", error as Error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize gateway if not already done
    const { app } = await initializeGateway();

    // Handle different routes
    const { url = "/", method = "GET" } = req;

    // Log request for monitoring
    logger.info("Vercel request received", {
      method,
      url,
      userAgent: req.headers["user-agent"],
      ip: req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
    });

    // Convert Vercel request to Fastify format
    const fastifyRequest = {
      method: method.toUpperCase(),
      url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      ip:
        (req.headers["x-forwarded-for"] as string) ||
        req.connection?.remoteAddress ||
        "unknown",
    };

    // Handle OPTIONS requests for CORS
    if (method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-api-key"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      return res.status(200).end();
    }

    // Route to appropriate handler
    if (url === "/health" && method === "GET") {
      const status = gatewayInstance!.getHealthStatus();
      return res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: "vercel",
        deployment: process.env.VERCEL_ENV || "unknown",
        servers: status,
      });
    }

    if (url === "/mcp" && method === "POST") {
      try {
        const response = await gatewayInstance!.handleHttpRequest(
          req.body,
          req.headers
        );
        return res.status(200).json(response);
      } catch (error) {
        logger.error("MCP request error", error as Error);
        return res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Fallback for unknown routes
    return res.status(404).json({
      error: "Not found",
      message: `Route ${method} ${url} not found`,
      availableRoutes: [
        "GET /health",
        "POST /mcp",
        "GET /mcp/ws (limited WebSocket support)",
      ],
    });
  } catch (error) {
    logger.error("Vercel handler error", error as Error);
    return res.status(500).json({
      error: "Server initialization error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
