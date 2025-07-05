// ============================================================================
// @MCP/SERVER-CORE - Main Exports
// ============================================================================

// Configuration types and interfaces
export type {
  BaseMcpServerConfig,
  McpServerConfig,
  ServerCreationOptions,
  ServerStartupOptions,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  HandlerRegistries,
} from "./config.js";

// HTTP server factory
export { createMcpHttpServer } from "./http-server.js";

// Server startup utilities
export { startMcpServer, createServerStarter } from "./server-startup.js";

// Entry point helpers
export {
  createServerEntryPoint,
  runMcpServer,
  type EntryPointOptions,
} from "./entry-point.js";
