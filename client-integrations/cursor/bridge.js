#!/usr/bin/env node

/**
 * Cursor MCP Bridge - Launcher for Cursor IDE
 * Uses the shared MCP Bridge Core to connect Cursor to the MCP Gateway
 */

import config from "../shared/config.js";
import MCPBridgeCore from "../shared/mcp-bridge-core.js";

async function main() {
  // Get gateway URL from command line args or environment
  const gatewayUrl =
    process.argv[2] || process.env.MCP_GATEWAY_URL || "http://localhost:37373";

  // Get Cursor-specific configuration
  const clientConfig = config.getClientConfig("cursor", {
    debug: process.env.MCP_BRIDGE_DEBUG === "true",
  });

  // Create and start the bridge
  const bridge = new MCPBridgeCore(gatewayUrl, clientConfig);

  try {
    await bridge.start();
  } catch (error) {
    console.error(`❌ Failed to start Cursor MCP Bridge: ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error(`❌ Uncaught exception in Cursor MCP Bridge: ${error.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, _promise) => {
  console.error(`❌ Unhandled rejection in Cursor MCP Bridge: ${reason}`);
  process.exit(1);
});

main();
