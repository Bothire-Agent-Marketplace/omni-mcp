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

// Server Registry System
export class MCPServerRegistry {
  private servers = new Map<string, MCPServerDefinition>();

  register(server: MCPServerDefinition): void {
    this.servers.set(server.name, server);
  }

  getServer(name: string): MCPServerDefinition | undefined {
    return this.servers.get(name);
  }

  getAllServers(): Record<string, MCPServerDefinition> {
    return Object.fromEntries(this.servers.entries());
  }

  getServersByCapability(capability: string): MCPServerDefinition[] {
    return Array.from(this.servers.values()).filter(
      (server) =>
        server.tools.includes(capability) ||
        server.resources.includes(capability) ||
        server.prompts.includes(capability)
    );
  }
}

// Global registry instance
export const serverRegistry = new MCPServerRegistry();

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

// Auto-register the Linear server
serverRegistry.register(LINEAR_SERVER);
