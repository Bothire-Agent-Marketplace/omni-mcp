import express, { type Express } from "express";
import cors from "cors";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";

const logger = createMcpLogger("linear-http-server");

// A simple mapping from MCP tool names to their handler functions.
const toolHandlerMap: Record<string, (params: any) => Promise<any>> = {
  linear_search_issues: handlers.handleLinearSearchIssues,
  linear_get_teams: handlers.handleLinearGetTeams,
  linear_get_users: handlers.handleLinearGetUsers,
  linear_get_projects: handlers.handleLinearGetProjects,
  linear_get_issue: handlers.handleLinearGetIssue,
};

export function createHttpServer(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Main MCP endpoint
  app.post("/mcp", async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== "2.0" || !method) {
      return res.status(400).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
    }

    // This is a simplified router. A more robust implementation would
    // handle different method types like 'resources/read', etc.
    if (method !== "tools/call") {
      return res.status(404).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" },
      });
    }

    const toolName = params?.name;
    const handler = toolHandlerMap[toolName];

    if (!handler) {
      return res.status(404).json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: "Method not found",
          data: `Tool handler for '${toolName}' not found.`,
        },
      });
    }

    try {
      const result = await handler(params?.arguments || {});
      res.json({ jsonrpc: "2.0", id, result });
    } catch (error: any) {
      logger.error("Handler error", error);
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

export function startHttpServer() {
  const app = createHttpServer();
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    logger.info(`🚀 Linear MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  });
}
