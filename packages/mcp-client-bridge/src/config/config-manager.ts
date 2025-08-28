import { ClaudeDesktopClient } from "../clients/claude-desktop.js";
import { CursorClient } from "../clients/cursor.js";
import { LMStudioClient } from "../clients/lm-studio.js";
import {
  ClientBridgeConfig,
  ServerEndpoint,
  BridgeOptions,
  MCPClientType,
  Environment,
  CursorMCPConfig,
  ClaudeDesktopMCPConfig,
  BaseMCPClientConfig,
} from "../types/client-types.js";

const DEV_API_KEY = "dev-api-key-12345";

export class ConfigManager {
  private servers: Map<string, ServerEndpoint> = new Map();
  private bridgeOptions: BridgeOptions;
  private environment: Environment;
  private cursorClient: CursorClient;
  private claudeDesktopClient: ClaudeDesktopClient;
  private lmStudioClient: LMStudioClient;

  constructor(config?: Partial<ClientBridgeConfig>) {
    this.environment = config?.environment || "development";
    this.bridgeOptions = {
      debug: this.environment === "development",
      timeout: 30000,
      allowHttp: this.environment === "development",
      transport: "http-first",
      headers: {},
      ...config?.bridgeOptions,
    };

    this.cursorClient = new CursorClient(this.bridgeOptions);
    this.claudeDesktopClient = new ClaudeDesktopClient(this.bridgeOptions);
    this.lmStudioClient = new LMStudioClient(this.bridgeOptions);

    if (config?.servers) {
      Object.entries(config.servers).forEach(([name, endpoint]) => {
        this.addServer(name, endpoint as ServerEndpoint);
      });
    }
  }

  private configureServerEndpoint(
    name: string,
    url: string,
    environment: Environment
  ): ServerEndpoint {
    const endpoint: ServerEndpoint = {
      name,
      url,
      environment,
      authRequired: !url.startsWith("http://localhost"),
      headers: {},
    };

    if (environment === "development" && url.startsWith("http://localhost")) {
      endpoint.headers = {
        "x-api-key": process.env.MCP_API_KEY || DEV_API_KEY,
      };
    }

    return endpoint;
  }

  addServer(name: string, endpoint: ServerEndpoint): void {
    this.servers.set(name, endpoint);

    this.cursorClient.addServer(name, endpoint);
    this.claudeDesktopClient.addServer(name, endpoint);
    this.lmStudioClient.addServer(name, endpoint);
  }

  removeServer(name: string): void {
    this.servers.delete(name);

    this.cursorClient.removeServer(name);
    this.claudeDesktopClient.removeServer(name);
    this.lmStudioClient.removeServer(name);
  }

  getClient(
    clientType: MCPClientType
  ): CursorClient | ClaudeDesktopClient | LMStudioClient {
    switch (clientType) {
      case "cursor":
        return this.cursorClient;
      case "claude-desktop":
        return this.claudeDesktopClient;
      case "lm-studio":
        return this.lmStudioClient;
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }

  async generateConfigs(
    clientTypes: MCPClientType[] = ["cursor", "claude-desktop", "lm-studio"]
  ): Promise<{
    cursor?: CursorMCPConfig;
    "claude-desktop"?: ClaudeDesktopMCPConfig;
    "lm-studio"?: { mcpServers: Record<string, BaseMCPClientConfig> };
  }> {
    const configs: {
      cursor?: CursorMCPConfig;
      "claude-desktop"?: ClaudeDesktopMCPConfig;
      "lm-studio"?: { mcpServers: Record<string, BaseMCPClientConfig> };
    } = {};

    for (const clientType of clientTypes) {
      const client = this.getClient(clientType) as unknown as {
        generateConfig: () => unknown;
      };

      (configs as Record<string, unknown>)[clientType] =
        client.generateConfig();
    }

    return configs;
  }

  async saveConfigs(
    clientTypes: MCPClientType[] = ["cursor", "claude-desktop", "lm-studio"],
    customPaths?: Partial<Record<MCPClientType, string>>
  ): Promise<void> {
    const results = await Promise.allSettled(
      clientTypes.map(async (clientType) => {
        const client = this.getClient(clientType);
        const customPath = customPaths?.[clientType];
        await client.saveConfig(customPath);
        return clientType;
      })
    );

    results.forEach((result, index) => {
      const clientType = clientTypes[index];
      if (result.status === "rejected") {
        console.error(`❌ Failed to save ${clientType} config:`, result.reason);
      }
    });
  }

  async validateAll(): Promise<Record<MCPClientType, boolean>> {
    const results = await Promise.allSettled([
      this.cursorClient.validate(),
      this.claudeDesktopClient.validate(),
      this.lmStudioClient.validate(),
    ]);

    return {
      cursor: results[0].status === "fulfilled" ? results[0].value : false,
      "claude-desktop":
        results[1].status === "fulfilled" ? results[1].value : false,
      "lm-studio": results[2].status === "fulfilled" ? results[2].value : false,
    };
  }

  async testAllConnections(): Promise<Record<string, boolean>> {
    const cursorResults = await this.cursorClient.testConnections();
    return cursorResults;
  }

  getSummary(): {
    environment: Environment;
    serverCount: number;
    servers: Array<{
      name: string;
      url: string;
      environment: string;
    }>;
    bridgeOptions: BridgeOptions;
  } {
    const servers = Array.from(this.servers.entries()).map(
      ([name, endpoint]) => ({
        name,
        url: endpoint.url,
        environment: endpoint.environment,
      })
    );

    return {
      environment: this.environment,
      serverCount: this.servers.size,
      servers,
      bridgeOptions: this.bridgeOptions,
    };
  }

  updateBridgeOptions(options: Partial<BridgeOptions>): void {
    this.bridgeOptions = { ...this.bridgeOptions, ...options };

    this.cursorClient = new CursorClient(this.bridgeOptions);
    this.claudeDesktopClient = new ClaudeDesktopClient(this.bridgeOptions);
    this.lmStudioClient = new LMStudioClient(this.bridgeOptions);

    this.servers.forEach((endpoint, name) => {
      this.cursorClient.addServer(name, endpoint);
      this.claudeDesktopClient.addServer(name, endpoint);
      this.lmStudioClient.addServer(name, endpoint);
    });
  }

  static forDevelopment(
    gatewayUrl: string = "http://localhost:37373",
    additionalServers?: Record<string, string>,
    options?: {
      bridgeOptions?: Partial<BridgeOptions>;
    }
  ): ConfigManager {
    const servers = {
      gateway: gatewayUrl,
      ...additionalServers,
    };

    return ConfigManager.fromServers(servers, {
      environment: "development",
      bridgeOptions: {
        debug: true,
        allowHttp: true,
        ...options?.bridgeOptions,
      },
    });
  }

  static fromServers(
    servers: Record<string, string>,
    options?: {
      environment?: Environment;
      bridgeOptions?: Partial<BridgeOptions>;
    }
  ): ConfigManager {
    const environment = options?.environment || "development";
    const serverEndpoints: Record<string, ServerEndpoint> = {};

    Object.entries(servers).forEach(([name, url]) => {
      const endpoint: ServerEndpoint = {
        name,
        url,
        environment,
        authRequired: !url.startsWith("http://localhost"),
        headers: {},
      };

      if (environment === "development" && url.startsWith("http://localhost")) {
        endpoint.headers = {
          "x-api-key": process.env.MCP_API_KEY || DEV_API_KEY,
        };
      }

      serverEndpoints[name] = endpoint;
    });

    return new ConfigManager({
      servers: serverEndpoints,
      clients: ["cursor", "claude-desktop", "lm-studio"],
      environment,
      bridgeOptions: options?.bridgeOptions || {},
    });
  }

  exportConfig(): ClientBridgeConfig {
    const servers: Record<string, ServerEndpoint> = {};
    this.servers.forEach((endpoint, name) => {
      servers[name] = endpoint;
    });

    return {
      servers,
      clients: ["cursor", "claude-desktop", "lm-studio"],
      environment: this.environment,
      bridgeOptions: this.bridgeOptions,
    };
  }
}
