import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Definition
// ============================================================================

export const DEVTOOLS_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "devtools",
  port: 3004,
  description:
    "Chrome DevTools MCP Server for browser automation, debugging, and testing with multi-browser support",
  productionUrl: "https://devtools-mcp.vercel.app",
  envVar: "DEVTOOLS_SERVER_URL",
  isEnabled: true,
  tools: [
    // Chrome Management (5 tools)
    "chrome_start",
    "chrome_connect",
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

    // DOM Manipulation (9 tools)
    "dom_document",
    "dom_query",
    "dom_attributes",
    "dom_click",
    "dom_set_text",
    "dom_set_attribute",
    "dom_remove",
    "dom_get_styles",
    "dom_set_style",

    // CSS Inspection (2 tools)
    "css_computed_styles",
    "css_rules",

    // Storage Tools (3 tools)
    "storage_local",
    "storage_session",
    "storage_cookies",

    // Debugging Tools (9 tools)
    "debug_set_breakpoint",
    "debug_remove_breakpoint",
    "debug_evaluate",
    "debug_call_stack",
    "debug_step_over",
    "debug_step_into",
    "debug_step_out",
    "debug_resume",
    "debug_pause",

    // Error Handling (6 tools)
    "error_runtime",
    "error_network",
    "error_console",
    "error_clear",
    "error_listener",
    "error_summary",

    // Screenshot (1 tool)
    "screenshot_page",
  ],
  resources: ["chrome://session", "chrome://browser"],
  prompts: [
    "chrome_debugging_workflow",
    "browser_automation_workflow",
    "web_testing_workflow",
  ],
});
