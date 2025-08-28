import { serverRegistry, type MCPServerDefinition } from "@mcp/capabilities";

let _cachedServers: Record<string, MCPServerDefinition> | null = null;

function getServers(): Record<string, MCPServerDefinition> {
  if (_cachedServers === null) {
    _cachedServers = serverRegistry.getAllServers();
  }
  return _cachedServers;
}

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
