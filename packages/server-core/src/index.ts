// ============================================================================
// @MCP/SERVER-CORE - Main Exports
// ============================================================================

// Configuration types and interfaces
export type {
  BaseMcpServerConfig,
  McpServerConfig,
  ServerCreationOptions,
  EnhancedServerCreationOptions,
  ServerStartupOptions,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  HandlerRegistries,
  DynamicHandlerRegistry,
  OrganizationContext,
  RequestContext,
} from "./config.js";

// HTTP server factory
export {
  createMcpHttpServer,
  createEnhancedMcpHttpServer,
} from "./http-server.js";
export type { FastifyInstance } from "fastify";

// Dynamic handler registry
export {
  DefaultDynamicHandlerRegistry,
  createDynamicHandlerRegistry,
  createEnhancedHandlerRegistries,
} from "./dynamic-handlers.js";

// Server registry for database lookups
export {
  ServerRegistry,
  getServerRegistry,
  cleanupServerRegistry
} from "./server-registry.js";

// Server startup utilities
export { startMcpServer, createServerStarter } from "./server-startup.js";

// Entry point helpers
export {
  createServerEntryPoint,
  runMcpServer,
  type EntryPointOptions,
} from "./entry-point.js";
