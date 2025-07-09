import { ConfigManager } from "./config/config-manager.js";
import {
  MCPClientType,
  Environment,
  BridgeOptions,
  CursorMCPConfig,
  ClaudeDesktopMCPConfig,
} from "./types/client-types.js";

/**
 * Create a ConfigManager with simple server URLs
 */
export function createConfigManager(
  servers: Record<string, string>,
  options?: {
    environment?: Environment;
    bridgeOptions?: Partial<BridgeOptions>;
  }
): ConfigManager {
  return ConfigManager.fromServers(servers, options);
}

/**
 * Generate client configurations for common scenarios
 */
export async function generateClientConfigs(
  servers: Record<string, string>,
  options?: {
    clients?: MCPClientType[];
    environment?: Environment;
    bridgeOptions?: Partial<BridgeOptions>;
  }
): Promise<{
  cursor?: CursorMCPConfig;
  "claude-desktop"?: ClaudeDesktopMCPConfig;
}> {
  const manager = createConfigManager(servers, {
    environment: options?.environment,
    bridgeOptions: options?.bridgeOptions,
  });

  return manager.generateConfigs(options?.clients);
}

/**
 * Deploy configurations to client directories
 */
export async function deployConfigs(
  servers: Record<string, string>,
  options?: {
    clients?: MCPClientType[];
    environment?: Environment;
    bridgeOptions?: Partial<BridgeOptions>;
    customPaths?: Partial<Record<MCPClientType, string>>;
  }
): Promise<void> {
  const manager = createConfigManager(servers, {
    environment: options?.environment,
    bridgeOptions: options?.bridgeOptions,
  });

  await manager.saveConfigs(options?.clients, options?.customPaths);
}
