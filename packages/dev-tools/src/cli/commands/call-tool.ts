import { MCPClient } from "../../utils/mcp-client.js";

interface CallToolOptions {
  args?: string;
  url?: string;
}

export async function callTool(
  toolName: string,
  options: CallToolOptions
): Promise<void> {
  const gatewayUrl = options.url || "http://localhost:37373";
  const client = new MCPClient(gatewayUrl);

  try {
    console.log(`🔧 Calling tool: ${toolName}`);

    // Parse arguments
    let args = {};
    if (options.args) {
      try {
        args = JSON.parse(options.args);
      } catch (error) {
        console.error("❌ Invalid JSON arguments:", error);
        process.exit(1);
      }
    }

    // Call the tool
    const response = await client.callTool(toolName, args);

    console.log("✅ Tool call result:");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("❌ Failed to call tool:", error);
    process.exit(1);
  }
}
