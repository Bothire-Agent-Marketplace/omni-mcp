#!/usr/bin/env node

import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { main } from "./mcp-server/server.js";

// Initialize MCP-compliant logger
const logger = createMcpLogger("linear-mcp-server");

// Setup global error handlers
setupGlobalErrorHandlers(logger);

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  logger.serverShutdown({ signal: "SIGTERM" });
  process.stderr.write("Received SIGTERM, shutting down gracefully...\n");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.serverShutdown({ signal: "SIGINT" });
  process.stderr.write("Received SIGINT, shutting down gracefully...\n");
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.serverStartup();
  main().catch((error) => {
    logger.error("Unhandled error in main", error);
    process.exit(1);
  });
}
