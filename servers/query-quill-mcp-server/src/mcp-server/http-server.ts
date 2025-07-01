
import express, { Express } from "express";
import cors from "cors";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";
import { CONFIG } from "../config/config.js";

const logger = createMcpLogger(`${CONFIG.SERVICE_NAME}-http`);

// Map MCP tool names to their handler functions.
const handlerMap: Record<string, (params: any) => Promise<any>> = {
  "query-quill_search": handlers.handleExampleSearch,
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
  app.post("/mcp", async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== "2.0" || !method || method !== "tools/call") {
      return res.status(400).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
    }

    const toolName = params?.name;
    const handler = handlerMap[toolName];

    if (!handler) {
      return res.status(404).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${toolName}` },
      });
    }

    try {
      const result = await handler(params?.arguments || {});
      res.json({ jsonrpc: "2.0", id, result });
    } catch (error: any) {
      logger.error("Handler error", { toolName, error: error.message });
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
