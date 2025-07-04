import { serverRegistry, type MCPServerDefinition } from "@mcp/capabilities";

// All server definitions are now centralized in @mcp/capabilities
// No need to import individual definition files - they auto-register

// Central registry of all MCP servers
export function getAllMCPServers(): Record<string, MCPServerDefinition> {
  const servers = serverRegistry.getAllServers();
  return servers;
}

// Lazy getter for server registry to ensure proper initialization
let _cachedServers: Record<string, MCPServerDefinition> | null = null;

function getServers(): Record<string, MCPServerDefinition> {
  if (_cachedServers === null) {
    _cachedServers = getAllMCPServers();
  }
  return _cachedServers;
}

// Main export for server registry using a getter
export const ALL_MCP_SERVERS = new Proxy(
  {} as Record<string, MCPServerDefinition>,
  {
    get(_target, prop: string) {
      const servers = getServers();
      return servers[prop];
    },
    ownKeys(_target) {
      const servers = getServers();
      return Object.keys(servers);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const servers = getServers();
      if (prop in servers) {
        return {
          enumerable: true,
          configurable: true,
          value: servers[prop as string],
        };
      }
      return undefined;
    },
    has(_target, prop) {
      const servers = getServers();
      return prop in servers;
    },
  }
);
