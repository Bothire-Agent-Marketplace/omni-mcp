import {
  BridgeOptions,
  ServerEndpoint,
  CompleteBridgeOptions,
  applyBridgeDefaults,
} from "../types/client-types.js";

export abstract class BaseBridge {
  protected serverEndpoint: ServerEndpoint;
  protected options: CompleteBridgeOptions;

  constructor(serverEndpoint: ServerEndpoint, options: BridgeOptions = {}) {
    this.serverEndpoint = serverEndpoint;
    this.options = applyBridgeDefaults(options);
  }

  abstract generateCommand(): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };

  abstract validate(): Promise<boolean>;

  getDescription(): string {
    return `Bridge to ${this.serverEndpoint.name} (${this.serverEndpoint.url})`;
  }

  getServerEndpoint(): ServerEndpoint {
    return this.serverEndpoint;
  }

  getOptions(): CompleteBridgeOptions {
    return this.options;
  }

  async testConnection(): Promise<boolean> {
    try {
      new URL(this.serverEndpoint.url);

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
          return true;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
