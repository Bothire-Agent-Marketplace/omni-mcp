// ============================================================================
// @MCP/SERVER-CORE - Main Exports
// ============================================================================

// Configuration types and interfaces
export type {
  McpServerConfig,
  ServerCreationOptions,
  EnhancedServerCreationOptions,
  ServerStartupOptions,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  HandlerRegistries,
  OrganizationContext,
  RequestContext,
} from "./config.js";

// HTTP server factory
export {
  createMcpHttpServer,
  createEnhancedMcpHttpServer,
} from "./http-server.js";

// Consolidated server factory (RECOMMENDED)
export {
  createMcpServer,
  createMcpServerWithClient,
  createMcpServerWithoutClient,
  type McpServerFactoryConfig,
} from "./server-factory.js";

export type { FastifyInstance } from "fastify";

// Dynamic handler registry
export type { DynamicHandlerRegistry } from "./dynamic-handlers.js";
export {
  DatabaseDynamicHandlerRegistry,
  createDynamicHandlerRegistry,
  createEnhancedHandlerRegistries,
} from "./dynamic-handlers.js";

// Server registry for database lookups
export {
  ServerRegistry,
  getServerRegistry,
  cleanupServerRegistry,
} from "./server-registry.js";

// Server startup utilities
export { startMcpServer, createServerStarter } from "./server-startup.js";

// Entry point helpers
export {
  createServerEntryPoint,
  runMcpServer,
  type EntryPointOptions,
} from "./entry-point.js";
