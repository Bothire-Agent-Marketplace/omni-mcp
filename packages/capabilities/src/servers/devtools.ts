import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

export const DEVTOOLS_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "devtools",
  port: 3003,
  description:
    "Streamlined Chrome DevTools MCP Server focused on essential debugging: console and network monitoring with Arc browser support",
  productionUrl: "https://devtools-mcp.vercel.app",
  envVar: "DEVTOOLS_SERVER_URL",
  isEnabled: true,
  tools: [
    "browser_start",
    "browser_navigate",
    "browser_status",
    "browser_close",
    "browser_screenshot",
    "console_logs",
    "console_execute",
    "console_clear",
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
