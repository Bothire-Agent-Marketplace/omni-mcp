import { z } from "zod";

export type Environment = "development" | "production" | "test";

export const EnvironmentSchema = z.enum(["development", "production", "test"]);

export interface McpServerConfig {
  env: Environment;

  port: number;

  host: string;

  logLevel: string;

  apiKey?: string;

  baseUrl?: string;

  timeout?: number;

  maxRetries?: number;

  metadata?: Record<string, unknown>;

  client?: Record<string, unknown>;
}

export interface McpServerRuntimeConfig {
  type: "mcp";

  url: string;

  capabilities: string[];

  description: string;

  healthCheckInterval: number;

  requiresAuth: boolean;

  maxRetries: number;
}

export interface McpServersRuntimeConfig {
  [serverId: string]: McpServerRuntimeConfig;
}

export interface McpGatewayConfig extends McpServerConfig {
  allowedOrigins: string[];

  jwtSecret: string;

  mcpApiKey: string;

  sessionTimeout: number;

  maxConcurrentSessions: number;

  rateLimitPerMinute: number;

  requireApiKey: boolean;

  enableRateLimit: boolean;

  maxRequestSizeMb: number;

  corsCredentials: boolean;

  securityHeaders: boolean;

  mcpServers: McpServersRuntimeConfig;
}

export interface McpServerDefinition {
  name: string;

  port: number;

  description: string;

  productionUrl: string;

  envVar: string;

  isEnabled: boolean;

  tools: string[];

  resources: string[];

  prompts: string[];
}

export const McpServerConfigSchema = z.object({
  env: EnvironmentSchema,
  port: z.number().int().min(1024).max(65535),
  host: z.string().min(1),
  logLevel: z.enum(["debug", "info", "warn", "error"]),

  apiKey: z.string().optional(),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  client: z.record(z.string(), z.unknown()).optional(),
});

export const McpServerRuntimeConfigSchema = z.object({
  type: z.literal("mcp"),
  url: z.string().url(),
  capabilities: z.array(z.string()),
  description: z.string(),
  healthCheckInterval: z.number().int().positive(),
  requiresAuth: z.boolean(),
  maxRetries: z.number().int().min(0).max(10),
});

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

export function isMcpServerConfig(obj: unknown): obj is McpServerConfig {
  const result = McpServerConfigSchema.safeParse(obj);
  return result.success;
}

export function isRuntimeServerConfig(
  obj: unknown
): obj is McpServerRuntimeConfig {
  const result = McpServerRuntimeConfigSchema.safeParse(obj);
  return result.success;
}
