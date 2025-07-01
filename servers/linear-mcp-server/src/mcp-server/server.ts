import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupLinearTools } from "./tools.js";
import { setupLinearResources } from "./resources.js";
import { setupLinearPrompts } from "./prompts.js";

// ============================================================================
// OFFICIAL MCP SDK PATTERN - Clean & Simple Server Setup
// ============================================================================

export function createLinearMcpServer() {
  // Create the MCP server
  const server = new McpServer({
    name: "@mcp/linear-server",
    version: "1.0.0",
  });

  // Setup all Linear functionality
  setupLinearTools(server);
  setupLinearResources(server);
  setupLinearPrompts(server);

  return server;
}

// Entry point for stdio transport
export async function main() {
  const server = createLinearMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
