import { EventEmitter } from "events";
import {
  McpServerRuntimeConfig,
  ServerInstance,
  HealthStatus,
} from "@mcp/schemas";
import { getJson } from "@mcp/utils";
import { McpLogger } from "@mcp/utils";

export class MCPServerManager extends EventEmitter {
  private logger: McpLogger;
  private servers = new Map<string, ServerInstance>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  private serverConfigs: Record<string, McpServerRuntimeConfig>;

  constructor(
    serverConfigs: Record<string, McpServerRuntimeConfig>,
    logger: McpLogger
  ) {
    super();
    this.logger = logger;
    this.serverConfigs = serverConfigs;
    Object.entries(serverConfigs).forEach(([serverId, config]) => {
      if (config.url) {
        this.servers.set(serverId, {
          id: serverId,
          serverId,
          url: config.url,
          lastHealthCheck: new Date(),
          isHealthy: false,
          activeConnections: 0,
          capabilities: config.capabilities,
        });
      }
    });
  }

  async initialize(): Promise<void> {
    this.logger.info(
      "Initializing server manager with network-based servers..."
    );
    for (const serverId of this.servers.keys()) {
      await this.performHealthCheck(serverId);
      this.startHealthChecks(serverId);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down server manager...");
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
  }

  async getServerInstance(
    serverId: string,
    _capability?: string
  ): Promise<ServerInstance | null> {
    const server = this.servers.get(serverId);

    if (!server || !server.isHealthy) {
      this.logger.warn(
        `No healthy instances available for server: ${serverId}`
      );
      return null;
    }

    server.activeConnections++;
    return server;
  }

  releaseServerInstance(instance: ServerInstance): void {
    if (instance.activeConnections > 0) {
      instance.activeConnections--;
    }
  }

  getHealthStatus(): HealthStatus {
    const status: HealthStatus = {};
    for (const [serverId, server] of this.servers.entries()) {
      status[serverId] = {
        instances: 1,
        healthy: server.isHealthy ? 1 : 0,
        capabilities: server.capabilities,
        lastCheck: server.lastHealthCheck.toISOString(),
      };
    }
    return status;
  }

  private startHealthChecks(serverId: string): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    const healthCheckInterval =
      this.getServerConfig(serverId)?.healthCheckInterval || 30000;

    const interval = setInterval(
      () => this.performHealthCheck(serverId),
      healthCheckInterval
    );
    this.healthCheckIntervals.set(serverId, interval);
  }

  private async performHealthCheck(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server || !server.url) {
      return;
    }

    try {
      const healthUrl = `${server.url}/health`;

      try {
        await getJson(healthUrl, { timeoutMs: 5000 });
        if (!server.isHealthy) {
          this.logger.info(`Server '${serverId}' is now healthy.`);
        }
        server.isHealthy = true;
      } catch {
        if (server.isHealthy) {
          this.logger.warn(`Server '${serverId}' is now unhealthy.`);
        }
        server.isHealthy = false;
      }
    } catch (error: unknown) {
      if (server.isHealthy) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Health check failed for server '${serverId}'. Error: ${errorMessage}`
        );
      }
      server.isHealthy = false;
    } finally {
      server.lastHealthCheck = new Date();
    }
  }

  private getServerConfig(
    serverId: string
  ): McpServerRuntimeConfig | undefined {
    return this.serverConfigs[serverId];
  }
}
