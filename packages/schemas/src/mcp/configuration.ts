import { z } from "zod";

// ============================================================================
// MCP SERVER CONFIGURATION SYSTEM - Consolidated Types
// ============================================================================
//
// This file consolidates all MCP server configuration types used across
// the entire codebase. All servers should extend these base configurations.
// ============================================================================

/**
 * Environment type used across all services
 */
export type Environment = "development" | "production" | "test";

/**
 * Zod schema for environment validation
 */
export const EnvironmentSchema = z.enum(["development", "production", "test"]);

// ============================================================================
// UNIFIED SERVER CONFIGURATION
// ============================================================================

/**
 * Complete MCP server configuration - single source of truth
 * All MCP servers should use this interface directly without extending it
 */
export interface McpServerConfig {
  // Core server properties (required)
  /** Server environment */
  env: Environment;
  /** Server port number */
  port: number;
  /** Server host (default: 0.0.0.0) */
  host: string;
  /** Log level for the server */
  logLevel: string;

  // Optional server properties
  /** API key for the server (domain-specific) */
  apiKey?: string;
  /** Base URL for external API calls */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries for failed requests */
  maxRetries?: number;
  /** Additional server-specific metadata */
  metadata?: Record<string, unknown>;
  /** Client-specific configuration */
  client?: Record<string, unknown>;
}

// ============================================================================
// RUNTIME SERVER CONFIGURATION (Used by Gateway)
// ============================================================================

/**
 * Runtime configuration for MCP servers as seen by the Gateway
 * This is what the Gateway uses to manage server connections
 */
export interface McpServerRuntimeConfig {
  /** Server type - always "mcp" for MCP servers */
  type: "mcp";
  /** URL where the server is accessible */
  url: string;
  /** List of capabilities (tools, resources, prompts) */
  capabilities: string[];
  /** Human-readable description */
  description: string;
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
  /** Whether authentication is required */
  requiresAuth: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Collection of runtime server configurations keyed by server ID
 */
export interface McpServersRuntimeConfig {
  [serverId: string]: McpServerRuntimeConfig;
}

// ============================================================================
// GATEWAY CONFIGURATION
// ============================================================================

/**
 * Gateway-specific configuration interface
 * Consolidates gateway config from various locations
 */
export interface McpGatewayConfig extends McpServerConfig {
  /** Allowed CORS origins */
  allowedOrigins: string[];
  /** JWT secret for session management */
  jwtSecret: string;
  /** MCP API key for server authentication */
  mcpApiKey: string;
  /** Session timeout in milliseconds */
  sessionTimeout: number;
  /** Maximum concurrent sessions */
  maxConcurrentSessions: number;
  /** Rate limit per minute */
  rateLimitPerMinute: number;
  /** Whether API key is required */
  requireApiKey: boolean;
  /** Whether rate limiting is enabled */
  enableRateLimit: boolean;
  /** Maximum request size in MB */
  maxRequestSizeMb: number;
  /** Whether to allow credentials in CORS */
  corsCredentials: boolean;
  /** Whether to send security headers */
  securityHeaders: boolean;
  /** Runtime configuration for all MCP servers */
  mcpServers: McpServersRuntimeConfig;
}

// ============================================================================
// SERVER DEFINITION CONFIGURATION (Used by Capabilities Registry)
// ============================================================================

/**
 * Server definition configuration used by the capabilities registry
 * This defines how servers are registered and discovered
 */
export interface McpServerDefinition {
  /** Unique server name */
  name: string;
  /** Port number for development */
  port: number;
  /** Human-readable description */
  description: string;
  /** Production URL template */
  productionUrl: string;
  /** Environment variable name for production URL */
  envVar: string;
  /** Whether server is enabled by default */
  isEnabled: boolean;
  /** List of tool capabilities */
  tools: string[];
  /** List of resource capabilities */
  resources: string[];
  /** List of prompt capabilities */
  prompts: string[];
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for unified MCP server configuration
 */
export const McpServerConfigSchema = z.object({
  // Core properties (required)
  env: EnvironmentSchema,
  port: z.number().int().min(1024).max(65535),
  host: z.string().min(1),
  logLevel: z.enum(["debug", "info", "warn", "error"]),

  // Optional properties
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  client: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Zod schema for runtime server configuration
 */
export const McpServerRuntimeConfigSchema = z.object({
  type: z.literal("mcp"),
  url: z.string().url(),
  capabilities: z.array(z.string()),
  description: z.string(),
  healthCheckInterval: z.number().int().positive(),
  requiresAuth: z.boolean(),
  maxRetries: z.number().int().min(0).max(10),
});

/**
 * Zod schema for gateway configuration
 */
export const McpGatewayConfigSchema = McpServerConfigSchema.extend({
  allowedOrigins: z.array(z.string()),
  jwtSecret: z.string().min(32),
  mcpApiKey: z.string().min(1),
  sessionTimeout: z.number().int().positive(),
  maxConcurrentSessions: z.number().int().positive(),
  rateLimitPerMinute: z.number().int().positive(),
  requireApiKey: z.boolean(),
  enableRateLimit: z.boolean(),
  maxRequestSizeMb: z.number().int().positive(),
  corsCredentials: z.boolean(),
  securityHeaders: z.boolean(),
  mcpServers: z.record(z.string(), McpServerRuntimeConfigSchema),
});

/**
 * Zod schema for server definition
 */
export const McpServerDefinitionSchema = z.object({
  name: z.string().min(1),
  port: z.number().int().min(1024).max(65535),
  description: z.string().min(1),
  productionUrl: z.string().url(),
  envVar: z.string().min(1),
  isEnabled: z.boolean().default(true),
  tools: z.array(z.string()).min(1),
  resources: z.array(z.string()).min(1),
  prompts: z.array(z.string()).min(1),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a default MCP server configuration
 */
export function createMcpServerConfig(
  overrides: Partial<McpServerConfig> = {}
): McpServerConfig {
  return {
    env: "development",
    port: 3000,
    host: "0.0.0.0",
    logLevel: "info",
    timeout: 30000,
    maxRetries: 3,
    ...overrides,
  };
}

/**
 * Create a runtime server configuration from a server definition
 */
export function createRuntimeConfig(
  serverDef: McpServerDefinition,
  env: Environment
): McpServerRuntimeConfig {
  const isProduction = env === "production";

  return {
    type: "mcp",
    url: isProduction
      ? serverDef.productionUrl
      : `http://localhost:${serverDef.port}`,
    capabilities: [
      ...serverDef.tools,
      ...serverDef.resources,
      ...serverDef.prompts,
    ],
    description: serverDef.description,
    healthCheckInterval: isProduction ? 30000 : 15000,
    requiresAuth: isProduction,
    maxRetries: isProduction ? 3 : 1,
  };
}

/**
 * Validate server configuration
 */
export function validateServerConfig<T extends McpServerConfig>(
  config: T,
  schema: z.ZodSchema<T> = McpServerConfigSchema as unknown as z.ZodSchema<T>
): T {
  const result = schema.safeParse(config);

  if (!result.success) {
    const errors = result.error.format();
    throw new Error(
      `Server configuration validation failed: ${JSON.stringify(errors, null, 2)}`
    );
  }

  return result.data;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for MCP server configuration
 */
export function isMcpServerConfig(obj: unknown): obj is McpServerConfig {
  const result = McpServerConfigSchema.safeParse(obj);
  return result.success;
}

/**
 * Type guard for runtime server configuration
 */
export function isRuntimeServerConfig(
  obj: unknown
): obj is McpServerRuntimeConfig {
  const result = McpServerRuntimeConfigSchema.safeParse(obj);
  return result.success;
}
