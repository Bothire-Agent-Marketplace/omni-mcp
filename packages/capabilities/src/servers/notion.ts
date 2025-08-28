import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

export const NOTION_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "notion",
  port: 3004,
  description: "Notion MCP Server for [TODO: add description]",
  productionUrl: "https://notion-mcp.vercel.app",
  envVar: "NOTION_SERVER_URL",
  tools: [
    "notion_search_items",
    "notion_get_item",
    "notion_create_item",
    "notion_create_database",
    "notion_query_database",
    "notion_create_page",
    "notion_update_page_relations",
    "notion_search",
  ],

  resources: ["notion://items", "notion://projects"],
  prompts: ["notion_workflow", "notion_automation"],
});
