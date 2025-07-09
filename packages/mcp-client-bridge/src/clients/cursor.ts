import { writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { dirname, resolve } from "path";
import { MCPRemoteBridge } from "../bridges/mcp-remote-bridge.js";
import {
  CursorMCPConfig,
  ServerEndpoint,
  BridgeOptions,
  BaseMCPClientConfig,
} from "../types/client-types.js";

/**
 * Cursor IDE client implementation
 */
export class CursorClient {
  private bridges: Map<string, MCPRemoteBridge> = new Map();
  private bridgeOptions: BridgeOptions;

  constructor(bridgeOptions: BridgeOptions = {}) {
    this.bridgeOptions = bridgeOptions;
  }

  /**
   * Add a server endpoint with its bridge configuration
   */
  addServer(
    name: string,
    endpoint: ServerEndpoint,
    options?: BridgeOptions
  ): void {
    const finalOptions = { ...this.bridgeOptions, ...options };
    const bridge = new MCPRemoteBridge(endpoint, finalOptions);
    this.bridges.set(name, bridge);
  }

  /**
   * Remove a server configuration
   */
  removeServer(name: string): void {
    this.bridges.delete(name);
  }

  /**
   * Generate Cursor MCP configuration
   */
  generateConfig(): CursorMCPConfig {
    const mcpServers: Record<string, BaseMCPClientConfig> = {};

    for (const [name, bridge] of this.bridges) {
      const { command, args, env } = bridge.getClientCommand();

      mcpServers[name] = {
        name: bridge.getServerEndpoint().name,
        description: bridge.getDescription(),
        command,
        args,
        env,
      };
    }

    return {
      mcpServers,
    };
  }

  /**
   * Get the default Cursor configuration path
   */
  getDefaultConfigPath(): string {
    // Cursor typically stores config in ~/.cursor/mcp.json or similar
    // This might need adjustment based on actual Cursor config location
    return resolve(homedir(), ".cursor", "mcp.json");
  }

  /**
   * Save configuration to a file
   */
  async saveConfig(configPath?: string): Promise<void> {
    const path = configPath || this.getDefaultConfigPath();
    const config = this.generateConfig();

    // Ensure directory exists
    await mkdir(dirname(path), { recursive: true });

    // Write config file
    await writeFile(path, JSON.stringify(config, null, 2), "utf8");

    console.log(`✅ Cursor configuration saved to: ${path}`);
  }

  /**
   * Validate all bridges
   */
  async validate(): Promise<boolean> {
    let allValid = true;

    for (const [name, bridge] of this.bridges) {
      const isValid = await bridge.validate();
      if (!isValid) {
        console.error(`❌ Bridge '${name}' validation failed`);
        allValid = false;
      } else {
        console.log(`✅ Bridge '${name}' validation passed`);
      }
    }

    return allValid;
  }

  /**
   * Test connections to all servers
   */
  async testConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, bridge] of this.bridges) {
      try {
        const isConnected = await bridge.testConnection();
        results[name] = isConnected;

        if (isConnected) {
          console.log(`✅ ${name}: Connection successful`);
        } else {
          console.warn(`⚠️  ${name}: Connection failed`);
        }
      } catch (error) {
        results[name] = false;
        console.error(`❌ ${name}: Connection error -`, error);
      }
    }

    return results;
  }

  /**
   * Get configuration summary
   */
  getSummary(): {
    serverCount: number;
    servers: Array<{
      name: string;
      url: string;
      description: string;
    }>;
  } {
    const servers = Array.from(this.bridges.entries()).map(([name, bridge]) => {
      const endpoint = bridge.getServerEndpoint();
      return {
        name,
        url: endpoint.url,
        description: bridge.getDescription(),
      };
    });

    return {
      serverCount: this.bridges.size,
      servers,
    };
  }

  /**
   * Get bridge by name
   */
  getBridge(name: string): MCPRemoteBridge | undefined {
    return this.bridges.get(name);
  }

  /**
   * List all configured bridges
   */
  listBridges(): string[] {
    return Array.from(this.bridges.keys());
  }
}
