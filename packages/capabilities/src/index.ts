import { z } from "zod";

// Central MCP Server Capabilities
// This is the single source of truth for all MCP server configurations

export const MCPServerSchema = z.object({
  name: z.string(),
  port: z.number(),
  description: z.string(),
  productionUrl: z.string().url(),
  envVar: z.string(),
  tools: z.array(z.string()).min(1, "MCP servers must have at least one tool"),
  resources: z
    .array(z.string())
    .min(1, "MCP servers must have at least one resource"),
  prompts: z
    .array(z.string())
    .min(1, "MCP servers must have at least one prompt"),
});

export type MCPServerDefinition = z.infer<typeof MCPServerSchema>;

// =============================================================================
// CENTRALIZED SERVER DEFINITIONS
// =============================================================================
// All MCP server definitions in one place - single source of truth

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

// Add future servers here as needed
// export const POSTGRES_SERVER: MCPServerDefinition = { ... };
// export const SLACK_SERVER: MCPServerDefinition = { ... };

// =============================================================================
// SERVER REGISTRY SYSTEM
// =============================================================================

export class MCPServerRegistry {
  private servers = new Map<string, MCPServerDefinition>();

  register(server: MCPServerDefinition): void {
    // Validate that server has all required capabilities
    const validation = MCPServerSchema.safeParse(server);
    if (!validation.success) {
      console.error(
        `Failed to register server "${server.name}":`,
        validation.error.flatten()
      );
      throw new Error(
        `Server "${server.name}" validation failed: ${validation.error.message}`
      );
    }

    this.servers.set(server.name, server);
    console.log(
      `✅ Registered MCP server: ${server.name} (${server.tools.length} tools, ${server.resources.length} resources, ${server.prompts.length} prompts)`
    );
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

// Auto-register all defined servers
serverRegistry.register(LINEAR_SERVER);
// serverRegistry.register(POSTGRES_SERVER);
// serverRegistry.register(SLACK_SERVER);

// =============================================================================
// EXPORTS
// =============================================================================

// Export registry for gateway usage
export { serverRegistry as default };
