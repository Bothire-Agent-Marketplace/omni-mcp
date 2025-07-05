import type { Environment } from "@mcp/utils";

// ============================================================================
// BASE MCP SERVER CONFIGURATION
// ============================================================================

/**
 * Base configuration interface that all MCP servers should extend
 */
export interface BaseMcpServerConfig {
  /** Server port number */
  port: number;
  /** Server host (default: localhost) */
  host: string;
  /** Log level for the server */
  logLevel: string;
  /** Environment (development, production, test) */
  env: Environment;
}

/**
 * Generic MCP server configuration with optional client-specific config
 */
export interface McpServerConfig<TClientConfig = Record<string, unknown>>
  extends BaseMcpServerConfig {
  /** Client-specific configuration */
  client?: TClientConfig;
}

/**
 * Server creation options for the generic HTTP server factory
 */
export interface ServerCreationOptions<TClient = unknown> {
  /** Unique server name for logging and identification */
  serverName: string;
  /** Server configuration */
  config: BaseMcpServerConfig;
  /** Optional client instance (e.g., LinearClient, API client, etc.) */
  client?: TClient;
  /** Tool handlers registry */
  toolHandlers: Record<string, ToolHandler>;
  /** Resource handlers registry */
  resourceHandlers: Record<string, ResourceHandler>;
  /** Prompt handlers registry */
  promptHandlers: Record<string, PromptHandler>;
}

/**
 * Server startup options
 */
export interface ServerStartupOptions {
  /** Server name for logging */
  serverName: string;
  /** Server configuration */
  config: BaseMcpServerConfig;
  /** Function that creates the Fastify server instance */
  createServer: () => Promise<import("fastify").FastifyInstance>;
}

// ============================================================================
// HANDLER TYPES
// ============================================================================

/**
 * Generic tool handler function signature
 */
export type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{
    type: "text";
    text: string;
  }>;
}>;

/**
 * Generic resource handler function signature
 */
export type ResourceHandler = (uri: string) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
  }>;
}>;

/**
 * Generic prompt handler function signature
 */
export type PromptHandler = (args: Record<string, unknown>) => Promise<{
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}>;

// ============================================================================
// HANDLER REGISTRY TYPES
// ============================================================================

/**
 * Registry functions that servers must provide
 */
export interface HandlerRegistries {
  /** Get all available tools */
  getAvailableTools: () => Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
  /** Get all available resources */
  getAvailableResources: () => Array<{
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
  }>;
  /** Get all available prompts */
  getAvailablePrompts: () => Array<{
    name: string;
    description: string;
  }>;
}
