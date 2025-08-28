import { writeFile, mkdir } from "fs/promises";
import { homedir, platform } from "os";
import { dirname, resolve } from "path";
import { MCPRemoteBridge } from "../bridges/mcp-remote-bridge.js";
import {
  ClaudeDesktopMCPConfig,
  ServerEndpoint,
  BridgeOptions,
  BaseMCPClientConfig,
} from "../types/client-types.js";

export class ClaudeDesktopClient {
  private bridges: Map<string, MCPRemoteBridge> = new Map();
  private bridgeOptions: BridgeOptions;
  private globalShortcut?: string;

  constructor(bridgeOptions: BridgeOptions = {}, globalShortcut?: string) {
    this.bridgeOptions = bridgeOptions;
    this.globalShortcut = globalShortcut;
  }

  addServer(
    name: string,
    endpoint: ServerEndpoint,
    options?: BridgeOptions
  ): void {
    const finalOptions = { ...this.bridgeOptions, ...options };
    const bridge = new MCPRemoteBridge(endpoint, finalOptions);
    this.bridges.set(name, bridge);
  }

  removeServer(name: string): void {
    this.bridges.delete(name);
  }

  setGlobalShortcut(shortcut: string): void {
    this.globalShortcut = shortcut;
  }

  generateConfig(): ClaudeDesktopMCPConfig {
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

    const config: ClaudeDesktopMCPConfig = {
      mcpServers,
    };

    if (this.globalShortcut) {
      config.globalShortcut = this.globalShortcut;
    }

    return config;
  }

  getDefaultConfigPath(): string {
    const os = platform();

    switch (os) {
      case "darwin":
        return resolve(
          homedir(),
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json"
        );
      case "win32":
        return resolve(
          homedir(),
          "AppData",
          "Roaming",
          "Claude",
          "claude_desktop_config.json"
        );
      case "linux":
        return resolve(
          homedir(),
          ".config",
          "Claude",
          "claude_desktop_config.json"
        );
      default:
        return resolve(homedir(), ".claude_desktop_config.json");
    }
  }

  async saveConfig(configPath?: string): Promise<void> {
    const path = configPath || this.getDefaultConfigPath();
    const config = this.generateConfig();

    await mkdir(dirname(path), { recursive: true });

    await writeFile(path, JSON.stringify(config, null, 2), "utf8");

    console.log(`✅ Claude Desktop configuration saved to: ${path}`);
  }

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

  getSummary(): {
    serverCount: number;
    globalShortcut?: string;
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
      globalShortcut: this.globalShortcut,
      servers,
    };
  }

  getBridge(name: string): MCPRemoteBridge | undefined {
    return this.bridges.get(name);
  }

  listBridges(): string[] {
    return Array.from(this.bridges.keys());
  }
}
