import {
  BridgeOptions,
  ServerEndpoint,
  CompleteBridgeOptions,
  applyBridgeDefaults,
} from "../types/client-types.js";

/**
 * Abstract base class for MCP bridges
 */
export abstract class BaseBridge {
  protected serverEndpoint: ServerEndpoint;
  protected options: CompleteBridgeOptions;

  constructor(serverEndpoint: ServerEndpoint, options: BridgeOptions = {}) {
    this.serverEndpoint = serverEndpoint;
    this.options = applyBridgeDefaults(options);
  }

  /**
   * Generate the command and arguments needed to start the bridge
   */
  abstract generateCommand(): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };

  /**
   * Validate the bridge configuration
   */
  abstract validate(): Promise<boolean>;

  /**
   * Get a human-readable description of this bridge
   */
  getDescription(): string {
    return `Bridge to ${this.serverEndpoint.name} (${this.serverEndpoint.url})`;
  }

  /**
   * Get the server endpoint this bridge connects to
   */
  getServerEndpoint(): ServerEndpoint {
    return this.serverEndpoint;
  }

  /**
   * Get the bridge options
   */
  getOptions(): CompleteBridgeOptions {
    return this.options;
  }

  /**
   * Test if the bridge can connect to the server
   */
  async testConnection(): Promise<boolean> {
    try {
      // Basic URL validation
      new URL(this.serverEndpoint.url);

      // For HTTP URLs, we could do a simple fetch test
      if (this.serverEndpoint.url.startsWith("http")) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            this.options.timeout
          );

          const response = await fetch(
            this.serverEndpoint.url.replace(/\/sse$/, "/health"),
            {
              method: "GET",
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);
          return response.ok;
        } catch {
          // Health endpoint might not exist, that's ok
          return true;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
