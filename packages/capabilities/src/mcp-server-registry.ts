import { MCPServerSchema, type MCPServerDefinition } from "./types.js";

export class MCPServerRegistry {
  private servers = new Map<string, MCPServerDefinition>();

  register(server: MCPServerDefinition): void {
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

export const serverRegistry = new MCPServerRegistry();
