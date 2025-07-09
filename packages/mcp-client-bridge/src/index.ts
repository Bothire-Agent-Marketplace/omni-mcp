// Types
export * from "./types/client-types.js";

// Bridges
export { BaseBridge } from "./bridges/base-bridge.js";
export { MCPRemoteBridge } from "./bridges/mcp-remote-bridge.js";

// Clients
export { CursorClient, ClaudeDesktopClient } from "./clients/index.js";

// Configuration Management
export { ConfigManager } from "./config/config-manager.js";

// Convenience exports for common use cases
export {
  createConfigManager,
  generateClientConfigs,
  deployConfigs,
} from "./utils.js";
