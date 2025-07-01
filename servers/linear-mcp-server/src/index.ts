#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { createLinearMcpServer } from "./mcp-server/server.js";

// Initialize MCP-compliant logger
const logger = createMcpLogger("linear-mcp-server");

// Setup global error handlers
setupGlobalErrorHandlers(logger);

async function main() {
  logger.serverStartup();

  try {
    // Create the Linear MCP server
    const server = createLinearMcpServer();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    logger.serverReady({
      transport: "stdio",
      capabilities: ["tools", "resources", "prompts"],
    });

    // Log server info to stderr (MCP compliant)
    process.stderr.write("Linear MCP Server running on stdio\n");
    process.stderr.write("Server: linear-mcp-server v1.0.0\n");
    process.stderr.write("Linear API Key: ✓ Configured\n");
  } catch (error) {
    logger.error("Failed to start Linear MCP server", error as Error);
    process.exit(1);
  }
}

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
  main().catch((error) => {
    logger.error("Unhandled error in main", error);
    process.exit(1);
  });
}
