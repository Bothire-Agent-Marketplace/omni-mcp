import { writeFile, mkdir } from "fs/promises";
import { homedir, platform } from "os";
import { dirname, resolve } from "path";
import { MCPRemoteBridge } from "../bridges/mcp-remote-bridge.js";
import {
  ServerEndpoint,
  BridgeOptions,
  BaseMCPClientConfig,
} from "../types/client-types.js";

export class LMStudioClient {
  private bridges: Map<string, MCPRemoteBridge> = new Map();
  private bridgeOptions: BridgeOptions;

  constructor(bridgeOptions: BridgeOptions = {}) {
    this.bridgeOptions = bridgeOptions;
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

  generateConfig(): { mcpServers: Record<string, BaseMCPClientConfig> } {
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
    return { mcpServers };
  }

  getDefaultConfigPath(): string {
    const os = platform();
    if (os === "win32") {
      return resolve(homedir(), ".lmstudio", "mcp.json");
    }

    return resolve(homedir(), ".lmstudio", "mcp.json");
  }

  async saveConfig(configPath?: string): Promise<void> {
    const path = configPath || this.getDefaultConfigPath();
    const config = this.generateConfig();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(config, null, 2), "utf8");
    console.log(`✅ LM Studio configuration saved to: ${path}`);
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
}
