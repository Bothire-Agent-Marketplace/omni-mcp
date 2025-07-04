// Centralized MCP Server Configuration in TypeScript
// This replaces mcp-servers.json with auto-imported capabilities

import type { MCPServerDefinition } from "@mcp/capabilities";
import type { Environment } from "./validation.js";

// Type definitions for the Gateway's runtime view of an MCP server
export interface MCPServerRuntimeConfig {
  type: "mcp";
  url: string;
  capabilities: string[];
  description: string;
  healthCheckInterval: number;
  requiresAuth: boolean;
  maxRetries: number;
}

export interface MCPServersRuntimeConfig {
  [key: string]: MCPServerRuntimeConfig;
}

/**
 * Builds the complete runtime configuration for all MCP servers,
 * which is primarily used by the Gateway to manage its connections.
 */
export function buildMCPServersConfig(
  allMcpServers: Record<string, MCPServerDefinition>,
  env: Environment
): MCPServersRuntimeConfig {
  const result: MCPServersRuntimeConfig = {};

  for (const [key, serverDef] of Object.entries(allMcpServers)) {
    const isProduction = env === "production";

    // In production, the URL is read from an environment variable for flexibility.
    // In development, we construct it from the defined port.
    const url = isProduction
      ? process.env[serverDef.envVar] || serverDef.productionUrl
      : `http://localhost:${serverDef.port}`;

    if (!url) {
      throw new Error(
        `URL for MCP server "${key}" is not defined. Set the ${serverDef.envVar} environment variable.`
      );
    }

    // Combine all capabilities for gateway routing
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

// Helper function to find which server provides a specific capability
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
