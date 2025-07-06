import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

// ============================================================================
// DEVTOOLS MCP SERVER - Definition
// ============================================================================

export const DEVTOOLS_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "devtools",
  port: 3004,
  description: "Devtools MCP Server for [TODO: add description]",
  productionUrl: "https://devtools-mcp.vercel.app",
  envVar: "DEVTOOLS_SERVER_URL",
  tools: ["devtools_search_items", "devtools_get_item", "devtools_create_item"],
  resources: ["devtools://items", "devtools://projects"],
  prompts: ["devtools_workflow", "devtools_automation"],
});
