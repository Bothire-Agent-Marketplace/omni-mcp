import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupQueryQuillTools } from "./tools.js";
import { setupQueryQuillResources } from "./resources.js";
import { setupQueryQuillPrompts } from "./prompts.js";

// ============================================================================
// OFFICIAL MCP SDK PATTERN - Clean & Simple Server Setup
// ============================================================================

export function createQueryQuillMcpServer() {
  // Create the MCP server
  const server = new McpServer({
    name: "@mcp/query-quill-server",
    version: "1.0.0",
  });

  // Setup all Query Quill functionality
  setupQueryQuillTools(server);
  setupQueryQuillResources(server);
  setupQueryQuillPrompts(server);

  return server;
}

// Entry point for stdio transport
export async function main() {
  const server = createQueryQuillMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
