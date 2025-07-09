import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Definition (Streamlined)
// ============================================================================

export const DEVTOOLS_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "devtools",
  port: 3004,
  description:
    "Streamlined Chrome DevTools MCP Server focused on essential debugging: console and network monitoring with Arc browser support",
  productionUrl: "https://devtools-mcp.vercel.app",
  envVar: "DEVTOOLS_SERVER_URL",
  isEnabled: true,
  tools: [
    // Chrome Management (6 tools)
    "chrome_start",
    "chrome_connect",
    "chrome_connect_existing", // New tool for existing browser connection
    "chrome_navigate",
    "chrome_status",
    "chrome_close",

    // Console Tools (3 tools)
    "console_logs",
    "console_execute",
    "console_clear",

    // Network Monitoring (2 tools)
    "network_requests",
    "network_response",
  ],
  resources: ["chrome://session", "chrome://browser"],
  prompts: [
    "console_debugging_workflow",
    "network_monitoring_workflow",
    "arc_browser_debugging_workflow",
  ],
});
