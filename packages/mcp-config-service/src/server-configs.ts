import type {
  Environment,
  McpServerRuntimeConfig,
  McpServersRuntimeConfig,
} from "@mcp/schemas";
import type { MCPServerDefinition } from "../../capabilities/src/types.js";

export type MCPServerRuntimeConfig = McpServerRuntimeConfig;
export type MCPServersRuntimeConfig = McpServersRuntimeConfig;

export async function buildMCPServersConfig(
  allMcpServers: Record<string, MCPServerDefinition>,
  env: Environment
): Promise<MCPServersRuntimeConfig> {
  const result: MCPServersRuntimeConfig = {};

  for (const [key, serverDef] of Object.entries(allMcpServers)) {
    const isProduction = env === "production";

    const isServerEnabled = serverDef.isEnabled;
    if (!isServerEnabled) continue;

    const url = isProduction
      ? process.env[serverDef.envVar] || serverDef.productionUrl
      : `http://localhost:${serverDef.port}`;

    if (!url) {
      throw new Error(
        `URL for MCP server "${key}" is not defined. Set the ${serverDef.envVar} environment variable.`
      );
    }

    const allCapabilities = [
      ...serverDef.tools,
      ...serverDef.resources,
      ...serverDef.prompts,
    ];

    result[key] = {
      type: "mcp",
      url,
      capabilities: [...allCapabilities],
      description: serverDef.description,
      healthCheckInterval: isProduction ? 30000 : 15000,
      requiresAuth: isProduction,
      maxRetries: isProduction ? 3 : 1,
    };
  }

  return result;
}

export function getServerByCapability(
  allMcpServers: Record<string, MCPServerDefinition>,
  capability: string
): string | null {
  for (const [serverName, server] of Object.entries(allMcpServers)) {
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
