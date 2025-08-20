import { z } from "zod";

/**
 * Supported MCP client types
 */
export type MCPClientType = "cursor" | "claude-desktop" | "lm-studio";

/**
 * Environment configurations
 */
export type Environment = "development" | "staging" | "production";

/**
 * Base configuration for any MCP client
 */
export const BaseMCPClientConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
});

export type BaseMCPClientConfig = z.infer<typeof BaseMCPClientConfigSchema>;

/**
 * Cursor-specific MCP configuration
 */
export const CursorMCPConfigSchema = z.object({
  mcpServers: z.record(z.string(), BaseMCPClientConfigSchema),
});

export type CursorMCPConfig = z.infer<typeof CursorMCPConfigSchema>;

/**
 * Claude Desktop-specific MCP configuration
 */
export const ClaudeDesktopMCPConfigSchema = z.object({
  mcpServers: z.record(z.string(), BaseMCPClientConfigSchema),
  globalShortcut: z.string().optional(),
});

export type ClaudeDesktopMCPConfig = z.infer<
  typeof ClaudeDesktopMCPConfigSchema
>;

/**
 * Client-specific configuration options
 */
export interface ClientOptions {
  cursor: {
    configPath: string;
    configFormat: "json";
  };
  "claude-desktop": {
    configPath: string;
    configFormat: "json";
  };
}

/**
 * Bridge options for mcp-remote (all optional)
 */
export const BridgeOptionsSchema = z.object({
  debug: z.boolean().optional(),
  timeout: z.number().optional(),
  allowHttp: z.boolean().optional(),
  transport: z.enum(["http-first", "sse-only", "http-only"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  staticOAuthClientMetadata: z.string().optional(),
  staticOAuthClientInfo: z.string().optional(),
});

export type BridgeOptions = z.infer<typeof BridgeOptionsSchema>;

/**
 * Complete bridge options with defaults applied
 */
export interface CompleteBridgeOptions {
  debug: boolean;
  timeout: number;
  allowHttp: boolean;
  transport: "http-first" | "sse-only" | "http-only";
  headers: Record<string, string>;
  staticOAuthClientMetadata?: string;
  staticOAuthClientInfo?: string;
}

/**
 * Apply default values to bridge options
 */
export function applyBridgeDefaults(
  options: BridgeOptions = {}
): CompleteBridgeOptions {
  return {
    debug: options.debug ?? false,
    timeout: options.timeout ?? 30000,
    allowHttp: options.allowHttp ?? false,
    transport: options.transport ?? "http-first",
    headers: (options.headers as Record<string, string>) ?? {},
    staticOAuthClientMetadata: options.staticOAuthClientMetadata,
    staticOAuthClientInfo: options.staticOAuthClientInfo,
  };
}

/**
 * Server endpoint configuration
 */
export const ServerEndpointSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  description: z.string().optional(),
  authRequired: z.boolean().default(false),
  headers: z.record(z.string(), z.string()).default({}),
  environment: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

export type ServerEndpoint = z.infer<typeof ServerEndpointSchema>;

/**
 * Complete client bridge configuration
 */
export const ClientBridgeConfigSchema = z.object({
  servers: z.record(z.string(), ServerEndpointSchema),
  clients: z.array(z.enum(["cursor", "claude-desktop", "lm-studio"])),
  environment: z
    .enum(["development", "staging", "production"])
    .default("development"),
  bridgeOptions: BridgeOptionsSchema,
});

export type ClientBridgeConfig = z.infer<typeof ClientBridgeConfigSchema>;
