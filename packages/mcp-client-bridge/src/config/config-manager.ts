import { ClaudeDesktopClient } from "../clients/claude-desktop.js";
import { CursorClient } from "../clients/cursor.js";
import {
  ClientBridgeConfig,
  ServerEndpoint,
  BridgeOptions,
  MCPClientType,
  Environment,
  CursorMCPConfig,
  ClaudeDesktopMCPConfig,
} from "../types/client-types.js";

// Default dev API key for local development
const DEV_API_KEY = "dev-api-key-12345";

/**
 * Centralized configuration manager for MCP client bridges
 */
export class ConfigManager {
  private servers: Map<string, ServerEndpoint> = new Map();
  private bridgeOptions: BridgeOptions;
  private environment: Environment;
  private cursorClient: CursorClient;
  private claudeDesktopClient: ClaudeDesktopClient;

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

    // Load servers if provided
    if (config?.servers) {
      Object.entries(config.servers).forEach(([name, endpoint]) => {
        this.addServer(name, endpoint as ServerEndpoint);
      });
    }
  }

  /**
   * Configure server endpoint with appropriate authentication headers
   */
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

    // Add API key for local development gateway
    if (environment === "development" && url.startsWith("http://localhost")) {
      endpoint.headers = {
        "x-api-key": process.env.MCP_API_KEY || DEV_API_KEY,
      };
    }

    return endpoint;
  }

  /**
   * Add a server endpoint
   */
  addServer(name: string, endpoint: ServerEndpoint): void {
    this.servers.set(name, endpoint);

    // Add to both clients
    this.cursorClient.addServer(name, endpoint);
    this.claudeDesktopClient.addServer(name, endpoint);
  }

  /**
   * Remove a server endpoint
   */
  removeServer(name: string): void {
    this.servers.delete(name);

    // Remove from both clients
    this.cursorClient.removeServer(name);
    this.claudeDesktopClient.removeServer(name);
  }

  /**
   * Get a specific client instance
   */
  getClient(clientType: MCPClientType): CursorClient | ClaudeDesktopClient {
    switch (clientType) {
      case "cursor":
        return this.cursorClient;
      case "claude-desktop":
        return this.claudeDesktopClient;
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }

  /**
   * Generate configurations for specified clients
   */
  async generateConfigs(
    clientTypes: MCPClientType[] = ["cursor", "claude-desktop"]
  ): Promise<{
    cursor?: CursorMCPConfig;
    "claude-desktop"?: ClaudeDesktopMCPConfig;
  }> {
    const configs: {
      cursor?: CursorMCPConfig;
      "claude-desktop"?: ClaudeDesktopMCPConfig;
    } = {};

    for (const clientType of clientTypes) {
      const client = this.getClient(clientType);
      configs[clientType] = client.generateConfig();
    }

    return configs;
  }

  /**
   * Save configurations for specified clients
   */
  async saveConfigs(
    clientTypes: MCPClientType[] = ["cursor", "claude-desktop"],
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

    // Report results
    results.forEach((result, index) => {
      const clientType = clientTypes[index];
      if (result.status === "rejected") {
        console.error(`❌ Failed to save ${clientType} config:`, result.reason);
      }
    });
  }

  /**
   * Validate all configurations
   */
  async validateAll(): Promise<Record<MCPClientType, boolean>> {
    const results = await Promise.allSettled([
      this.cursorClient.validate(),
      this.claudeDesktopClient.validate(),
    ]);

    return {
      cursor: results[0].status === "fulfilled" ? results[0].value : false,
      "claude-desktop":
        results[1].status === "fulfilled" ? results[1].value : false,
    };
  }

  /**
   * Test all connections
   */
  async testAllConnections(): Promise<Record<string, boolean>> {
    const cursorResults = await this.cursorClient.testConnections();
    return cursorResults; // Both clients use the same servers, so results are identical
  }

  /**
   * Get a summary of the current configuration
   */
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

  /**
   * Update bridge options
   */
  updateBridgeOptions(options: Partial<BridgeOptions>): void {
    this.bridgeOptions = { ...this.bridgeOptions, ...options };

    // Update both clients with new options
    this.cursorClient = new CursorClient(this.bridgeOptions);
    this.claudeDesktopClient = new ClaudeDesktopClient(this.bridgeOptions);

    // Re-add all servers
    this.servers.forEach((endpoint, name) => {
      this.cursorClient.addServer(name, endpoint);
      this.claudeDesktopClient.addServer(name, endpoint);
    });
  }

  /**
   * Create a development configuration with local gateway and API key
   */
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

  /**
   * Create a configuration from a simple server list
   */
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

      // Add API key for local development gateway
      if (environment === "development" && url.startsWith("http://localhost")) {
        endpoint.headers = {
          "x-api-key": process.env.MCP_API_KEY || DEV_API_KEY,
        };
      }

      serverEndpoints[name] = endpoint;
    });

    return new ConfigManager({
      servers: serverEndpoints,
      clients: ["cursor", "claude-desktop"],
      environment,
      bridgeOptions: options?.bridgeOptions || {},
    });
  }

  /**
   * Export current configuration to a JSON object
   */
  exportConfig(): ClientBridgeConfig {
    const servers: Record<string, ServerEndpoint> = {};
    this.servers.forEach((endpoint, name) => {
      servers[name] = endpoint;
    });

    return {
      servers,
      clients: ["cursor", "claude-desktop"],
      environment: this.environment,
      bridgeOptions: this.bridgeOptions,
    };
  }
}
