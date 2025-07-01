#!/usr/bin/env node

import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { startHttpServer } from "./mcp-server/http-server.js";

// Initialize MCP-compliant logger
const logger = createMcpLogger("linear-mcp-server");

// Setup global error handlers
setupGlobalErrorHandlers(logger);

// Graceful shutdown handlers (optional for HTTP server, but good practice)
process.on("SIGTERM", () => {
  logger.serverShutdown({ signal: "SIGTERM" });
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.serverShutdown({ signal: "SIGINT" });
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    logger.serverStartup();
    startHttpServer();
  } catch (error) {
    logger.error("Unhandled error during startup", error as Error);
    process.exit(1);
  }
}
