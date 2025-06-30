#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLinearMcpServer } from "./mcp-server/server.js";
import { LINEAR_CONFIG } from "./config/config.js";

async function main() {
  const server = createLinearMcpServer();
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  try {
    await server.connect(transport);
    console.error("Linear MCP Server running on stdio");
    console.error("Server: linear-mcp-server v1.0.0");
    console.error(
      "Linear API Key:",
      LINEAR_CONFIG.API_KEY ? "✓ Configured" : "✗ Missing"
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}
