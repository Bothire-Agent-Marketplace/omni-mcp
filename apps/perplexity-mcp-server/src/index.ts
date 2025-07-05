#!/usr/bin/env node

import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { perplexityServerConfig } from "./config/config.js";
import { startPerplexityServer } from "./mcp-server/http-server.js";

// Initialize MCP-compliant logger
export const logger = createMcpLogger({
  serverName: "perplexity-mcp-server",
  logLevel: perplexityServerConfig.logLevel,
  environment: perplexityServerConfig.env,
});

// Setup global error handlers
setupGlobalErrorHandlers(logger);

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

// Start the server
async function main() {
  try {
    logger.info(
      `Starting Perplexity MCP server on port ${perplexityServerConfig.port}`
    );
    startPerplexityServer(perplexityServerConfig);
  } catch (error) {
    logger.error("Unhandled error during startup", error as Error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
main();
