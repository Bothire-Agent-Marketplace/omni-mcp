import { ConfigManager } from "./config/config-manager.js";
import {
  MCPClientType,
  Environment,
  BridgeOptions,
  CursorMCPConfig,
  ClaudeDesktopMCPConfig,
} from "./types/client-types.js";

export function createConfigManager(
  servers: Record<string, string>,
  options?: {
    environment?: Environment;
    bridgeOptions?: Partial<BridgeOptions>;
  }
): ConfigManager {
  return ConfigManager.fromServers(servers, options);
}

export function createDevelopmentConfig(
  gatewayUrl: string = "http://localhost:37373",
  additionalServers?: Record<string, string>,
  options?: {
    bridgeOptions?: Partial<BridgeOptions>;
  }
): ConfigManager {
  return ConfigManager.forDevelopment(gatewayUrl, additionalServers, options);
}

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

export async function deployDevelopmentConfigs(
  gatewayUrl: string = "http://localhost:37373",
  options?: {
    clients?: MCPClientType[];
    additionalServers?: Record<string, string>;
    bridgeOptions?: Partial<BridgeOptions>;
    customPaths?: Partial<Record<MCPClientType, string>>;
  }
): Promise<void> {
  const manager = createDevelopmentConfig(
    gatewayUrl,
    options?.additionalServers,
    {
      bridgeOptions: options?.bridgeOptions,
    }
  );

  await manager.saveConfigs(options?.clients, options?.customPaths);
}
