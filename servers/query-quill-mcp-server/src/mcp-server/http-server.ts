import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";
import { CONFIG } from "../config/config.js";

const logger = createMcpLogger(`${CONFIG.SERVICE_NAME}-http`);

// Utility function to wrap async route handlers for cleaner error handling
const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Map MCP tool names to their handler functions.
const handlerMap: Record<string, (params: any) => Promise<any>> = {
  customer_lookup: handlers.handleCustomerLookup,
  film_inventory: handlers.handleFilmInventory,
  rental_analysis: handlers.handleRentalAnalysis,
  payment_investigation: handlers.handlePaymentInvestigation,
  business_analytics: handlers.handleBusinessAnalytics,
  database_health: handlers.handleDatabaseHealth,
};

export function createHttpServer(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Main MCP endpoint for tool calls
  app.post(
    "/mcp",
    asyncHandler(async (req: Request, res: Response) => {
      const { jsonrpc, method, params, id } = req.body;

      if (jsonrpc !== "2.0" || !method || method !== "tools/call") {
        res.status(400).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32600, message: "Invalid Request" },
        });
        return;
      }

      const toolName = params?.name;
      const handler = handlerMap[toolName];

      if (!handler) {
        res.status(404).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${toolName}` },
        });
        return;
      }

      try {
        const result = await handler(params?.arguments || {});
        res.json({ jsonrpc: "2.0", id, result });
      } catch (error: any) {
        logger.error(`Handler error for ${toolName}:`, error);
        res.status(500).json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message: "Internal error",
            data: error.message,
          },
        });
      }
    })
  );

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: err.message,
      },
    });
  });

  return app;
}

export function startHttpServer(port: number) {
  const app = createHttpServer();

  app.listen(port, () => {
    logger.info(`🚀 query-quill MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  });
}
