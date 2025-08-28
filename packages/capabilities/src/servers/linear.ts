import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

export const LINEAR_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "linear",
  port: 3001,
  description: "Linear MCP Server for issue tracking",
  productionUrl: "https://linear-mcp.vercel.app",
  envVar: "LINEAR_SERVER_URL",
  isEnabled: true,
  tools: [
    "linear_search_issues",
    "linear_get_teams",
    "linear_get_users",
    "linear_get_projects",
    "linear_get_issue",
  ],

  resources: ["linear://teams", "linear://users"],
  prompts: ["create_issue_workflow", "triage_workflow", "sprint_planning"],
});
