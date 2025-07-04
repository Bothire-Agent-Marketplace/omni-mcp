import { z } from "zod";

// Central MCP Server Capabilities
// This is the single source of truth for all MCP server configurations

export const MCPServerSchema = z.object({
  name: z.string(),
  port: z.number(),
  description: z.string(),
  productionUrl: z.string().url(),
  envVar: z.string(),
  tools: z.array(z.string()).readonly(),
  resources: z.array(z.string()).readonly(),
  prompts: z.array(z.string()).readonly(),
});

export type MCPServerDefinition = z.infer<typeof MCPServerSchema>;

// Linear MCP Server Configuration
export const LINEAR_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "linear",
  port: 3001,
  description: "Linear MCP Server for issue tracking",
  productionUrl: "https://linear-mcp.vercel.app",
  envVar: "LINEAR_SERVER_URL",
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

// Central registry of all MCP servers
export const ALL_MCP_SERVERS: Record<string, MCPServerDefinition> = {
  linear: LINEAR_SERVER,
} as const;

// Helper function to find which server provides a specific capability
export function getServerByCapability(capability: string): string | null {
  for (const [serverName, server] of Object.entries(ALL_MCP_SERVERS)) {
    if (
      (server.tools as readonly string[]).includes(capability) ||
      (server.resources as readonly string[]).includes(capability) ||
      (server.prompts as readonly string[]).includes(capability)
    ) {
      return serverName;
    }
  }
  return null;
}
