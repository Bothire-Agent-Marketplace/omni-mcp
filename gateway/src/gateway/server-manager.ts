import { spawn, ChildProcess } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { Logger, envConfig } from "@mcp/utils";
import { ServerConfig, ServerInstance, HealthStatus } from "./types.js";

export class ServerManager {
  private logger = Logger.getInstance("mcp-gateway-server-manager");
  private serverInstances = new Map<string, ServerInstance[]>();
  private serverConfigs = new Map<string, ServerConfig>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  constructor(serverConfigs: Record<string, ServerConfig>) {
    Object.entries(serverConfigs).forEach(([serverId, config]) => {
      this.serverConfigs.set(serverId, config);
      this.serverInstances.set(serverId, []);
    });
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing server manager...");

    // Start initial instances for each server
    for (const [serverId, config] of this.serverConfigs.entries()) {
      await this.ensureMinInstances(serverId);
      this.startHealthChecks(serverId);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down server manager...");

    // Clear health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    // Terminate all server instances
    for (const instances of this.serverInstances.values()) {
      for (const instance of instances) {
        await this.terminateInstance(instance);
      }
    }
    this.serverInstances.clear();
  }

  async getServerInstance(
    serverId: string,
    capability?: string
  ): Promise<ServerInstance | null> {
    const instances = this.serverInstances.get(serverId) || [];
    const healthyInstances = instances.filter((instance) => instance.isHealthy);

    if (healthyInstances.length === 0) {
      this.logger.warn(
        `No healthy instances available for server: ${serverId}`
      );
      await this.ensureMinInstances(serverId);
      return null;
    }

    // Use least-connections load balancing
    const selectedInstance = healthyInstances.reduce((prev, current) =>
      prev.activeConnections < current.activeConnections ? prev : current
    );

    selectedInstance.activeConnections++;
    return selectedInstance;
  }

  releaseServerInstance(instance: ServerInstance): void {
    if (instance.activeConnections > 0) {
      instance.activeConnections--;
    }
  }

  getHealthStatus(): HealthStatus {
    const status: HealthStatus = {};

    for (const [serverId, instances] of this.serverInstances.entries()) {
      const config = this.serverConfigs.get(serverId);
      const healthyInstances = instances.filter(
        (instance) => instance.isHealthy
      );

      status[serverId] = {
        instances: instances.length,
        healthy: healthyInstances.length,
        capabilities: config?.capabilities || [],
        lastCheck: new Date().toISOString(),
      };
    }

    return status;
  }

  private async ensureMinInstances(serverId: string): Promise<void> {
    const config = this.serverConfigs.get(serverId);
    const instances = this.serverInstances.get(serverId) || [];

    if (!config) {
      this.logger.error(`Server config not found: ${serverId}`);
      return;
    }

    const healthyInstances = instances.filter((instance) => instance.isHealthy);
    const minInstances = Math.max(1, Math.floor(config.maxInstances / 2));

    if (healthyInstances.length < minInstances) {
      const instancesToCreate = minInstances - healthyInstances.length;

      for (let i = 0; i < instancesToCreate; i++) {
        try {
          const instance = await this.createServerInstance(serverId, config);
          instances.push(instance);
          this.logger.info(
            `Created new instance for ${serverId}: ${instance.id}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to create instance for ${serverId}:`,
            error
          );
        }
      }
    }
  }

  private async createServerInstance(
    serverId: string,
    config: ServerConfig
  ): Promise<ServerInstance> {
    const instanceId = uuidv4();

    this.logger.debug(`Spawning server instance: ${serverId}/${instanceId}`);
    this.logger.debug(`Command: ${config.command} ${config.args.join(" ")}`);
    this.logger.debug(`Working directory: ${config.cwd || process.cwd()}`);

    // Resolve environment variables in server config
    // Following principle of least privilege: gateway only passes its own environment
    const serverEnv: Record<string, string> = {};

    // First, copy only safe environment variables (no secrets)
    const safeEnvVars = ["NODE_ENV", "LOG_LEVEL", "TZ", "PATH", "HOME", "USER"];

    safeEnvVars.forEach((key) => {
      if (process.env[key]) {
        serverEnv[key] = process.env[key] as string;
      }
    });

    // Set environment from our centralized config (gateway-specific only)
    serverEnv.NODE_ENV = envConfig.NODE_ENV;
    serverEnv.LOG_LEVEL = envConfig.LOG_LEVEL;
    if (envConfig.TZ) {
      serverEnv.TZ = envConfig.TZ;
    }

    // Process any config-specific environment variables (if any)
    if (config.env) {
      Object.entries(config.env).forEach(([key, value]) => {
        // Only allow non-secret environment variables
        if (
          !key.includes("KEY") &&
          !key.includes("SECRET") &&
          !key.includes("PASSWORD")
        ) {
          serverEnv[key] = value;
        } else {
          this.logger.warn(
            `Skipping secret environment variable: ${key} (servers should manage their own secrets)`
          );
        }
      });
    }

    // Debug: Log environment variables being passed (safe variables only)
    this.logger.debug(
      `Environment variables for ${serverId}:`,
      Object.keys(serverEnv)
    );

    const childProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      stdio: "pipe",
      env: serverEnv,
      shell: false, // Direct process spawning for better stdio control
    });

    const instance: ServerInstance = {
      id: instanceId,
      serverId,
      process: childProcess,
      lastHealthCheck: new Date(),
      isHealthy: true,
      activeConnections: 0,
      capabilities: config.capabilities,
    };

    // Handle process events
    childProcess.on("error", (error) => {
      this.logger.error(
        `Server instance error (${serverId}/${instanceId}):`,
        error
      );
      instance.isHealthy = false;
    });

    childProcess.on("exit", (code, signal) => {
      this.logger.warn(
        `Server instance exited (${serverId}/${instanceId}): code=${code}, signal=${signal}`
      );
      instance.isHealthy = false;
      this.removeInstance(serverId, instanceId);
    });

    // Set up basic MCP handshake validation
    await this.validateMCPConnection(instance);

    return instance;
  }

  private async validateMCPConnection(instance: ServerInstance): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.logger.error(
          `MCP handshake timeout for ${instance.serverId}/${instance.id}`
        );
        this.logger.error(`Process still running: ${!instance.process.killed}`);
        reject(new Error("MCP handshake timeout"));
      }, envConfig.MCP_HANDSHAKE_TIMEOUT);

      // Send initialization request
      const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "mcp-gateway",
            version: "1.0.0",
          },
        },
      };

      // Log what we're sending
      this.logger.debug(
        `Sending MCP init to ${instance.serverId}: ${JSON.stringify(
          initRequest
        )}`
      );
      instance.process.stdin.write(JSON.stringify(initRequest) + "\n");

      const onData = (data: Buffer) => {
        const rawData = data.toString().trim();
        this.logger.debug(`Received from ${instance.serverId}: ${rawData}`);

        // Log any startup messages that aren't JSON-RPC
        if (!rawData.startsWith("{")) {
          this.logger.info(
            `Startup message from ${instance.serverId}: ${rawData}`
          );
        }

        try {
          const response = JSON.parse(rawData);
          if (response.id === 1 && response.result) {
            this.logger.info(
              `MCP handshake successful for ${instance.serverId}`
            );
            clearTimeout(timeout);
            instance.process.stdout.off("data", onData);
            instance.process.stderr.off("data", onError);
            resolve();
          } else if (response.error) {
            this.logger.error(
              `MCP init error from ${instance.serverId}: ${JSON.stringify(
                response.error
              )}`
            );
            clearTimeout(timeout);
            instance.process.stdout.off("data", onData);
            instance.process.stderr.off("data", onError);
            reject(new Error(`MCP init failed: ${response.error.message}`));
          }
        } catch (error) {
          this.logger.debug(`Parse error from ${instance.serverId}: ${error}`);
          // Continue listening for more data
        }
      };

      const onError = (data: Buffer) => {
        const errorData = data.toString().trim();
        this.logger.error(`STDERR from ${instance.serverId}: ${errorData}`);

        // Check for common environment variable issues
        if (
          errorData.includes("environment variable") ||
          errorData.includes("LINEAR_API_KEY") ||
          errorData.includes("env")
        ) {
          this.logger.error(
            `Environment variable issue detected for ${instance.serverId}`
          );
          this.logger.debug(
            `Process env LINEAR_API_KEY present: ${!!process.env
              .LINEAR_API_KEY}`
          );
          this.logger.debug(
            `envConfig LINEAR_API_KEY present: ${!!envConfig.LINEAR_API_KEY}`
          );
        }
      };

      instance.process.stdout.on("data", onData);
      instance.process.stderr.on("data", onError);
    });
  }

  private startHealthChecks(serverId: string): void {
    const config = this.serverConfigs.get(serverId);
    if (!config) return;

    const interval = setInterval(async () => {
      await this.performHealthCheck(serverId);
    }, config.healthCheckInterval);

    this.healthCheckIntervals.set(serverId, interval);
  }

  private async performHealthCheck(serverId: string): Promise<void> {
    const instances = this.serverInstances.get(serverId) || [];

    for (const instance of instances) {
      try {
        // Simple ping to check if process is responsive
        const isAlive = !instance.process.killed && instance.process.pid;
        instance.isHealthy = !!isAlive;
        instance.lastHealthCheck = new Date();

        if (!instance.isHealthy) {
          this.logger.warn(`Instance unhealthy: ${serverId}/${instance.id}`);
          await this.terminateInstance(instance);
        }
      } catch (error) {
        this.logger.error(
          `Health check failed for ${serverId}/${instance.id}:`,
          error
        );
        instance.isHealthy = false;
      }
    }

    // Ensure minimum instances
    await this.ensureMinInstances(serverId);
  }

  private removeInstance(serverId: string, instanceId: string): void {
    const instances = this.serverInstances.get(serverId) || [];
    const filteredInstances = instances.filter(
      (instance) => instance.id !== instanceId
    );
    this.serverInstances.set(serverId, filteredInstances);
  }

  private async terminateInstance(instance: ServerInstance): Promise<void> {
    try {
      if (!instance.process.killed) {
        instance.process.kill("SIGTERM");

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!instance.process.killed) {
            instance.process.kill("SIGKILL");
          }
        }, 5000);
      }
    } catch (error) {
      this.logger.error(`Error terminating instance ${instance.id}:`, error);
    }
  }
}
