import type { McpServerConfig, OrganizationContext } from "@mcp/schemas";

// Re-export the unified OrganizationContext for backward compatibility
export type { OrganizationContext };

/**
 * Request context containing organization and user information
 */
export interface RequestContext {
  /** Organization context (optional for backward compatibility) */
  organization?: OrganizationContext;
  /** User ID making the request (optional) */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
}

// ============================================================================
// BASE MCP SERVER CONFIGURATION
// ============================================================================

/**
 * @deprecated Import from @mcp/schemas instead
 * Base configuration interface that all MCP servers should extend
 */
export type BaseMcpServerConfig = McpServerConfig;

// Re-export consolidated types from @mcp/schemas for backward compatibility
export type { McpServerConfig };

/**
 * Server creation options for the generic HTTP server factory
 */
export interface ServerCreationOptions<TClient = unknown> {
  /** Unique server name for logging and identification */
  serverName: string;
  /** Server configuration */
  config: McpServerConfig;
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
  config: McpServerConfig;
  /** Function that creates the Fastify server instance */
  createServer: () => Promise<import("fastify").FastifyInstance>;
}

// ============================================================================
// HANDLER TYPES
// ============================================================================

/**
 * Generic tool handler function signature with organization context
 */
export type ToolHandler = (
  params: Record<string, unknown>,
  context?: RequestContext
) => Promise<{
  content: Array<{
    type: "text";
    text: string;
  }>;
}>;

/**
 * Generic resource handler function signature with organization context
 */
export type ResourceHandler = (
  uri: string,
  context?: RequestContext
) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
  }>;
}>;

/**
 * Generic prompt handler function signature with organization context
 */
export type PromptHandler = (
  args: Record<string, unknown>,
  context?: RequestContext
) => Promise<{
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
  /** Get all available tools (with optional organization context) */
  getAvailableTools: (context?: RequestContext) =>
    | Array<{
        name: string;
        description: string;
        inputSchema: unknown;
      }>
    | Promise<
        Array<{
          name: string;
          description: string;
          inputSchema: unknown;
        }>
      >;
  /** Get all available resources (with optional organization context) */
  getAvailableResources: (context?: RequestContext) =>
    | Array<{
        uri: string;
        name: string;
        description: string;
        mimeType?: string;
      }>
    | Promise<
        Array<{
          uri: string;
          name: string;
          description: string;
          mimeType?: string;
        }>
      >;
  /** Get all available prompts (with optional organization context) */
  getAvailablePrompts: (context?: RequestContext) =>
    | Array<{
        name: string;
        description: string;
      }>
    | Promise<
        Array<{
          name: string;
          description: string;
        }>
      >;
}

// ============================================================================
// DYNAMIC HANDLER TYPES
// ============================================================================

/**
 * Dynamic handler registry that can load handlers based on organization context
 */
export interface DynamicHandlerRegistry {
  /** Get tool handler for a specific tool name and organization context */
  getToolHandler: (
    toolName: string,
    context?: RequestContext
  ) => Promise<ToolHandler | undefined>;
  /** Get resource handler for a specific URI and organization context */
  getResourceHandler: (
    uri: string,
    context?: RequestContext
  ) => Promise<ResourceHandler | undefined>;
  /** Get prompt handler for a specific prompt name and organization context */
  getPromptHandler: (
    promptName: string,
    context?: RequestContext
  ) => Promise<PromptHandler | undefined>;
  /** Get all available tools for a given context */
  getAvailableTools: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>
  >;
  /** Get all available resources for a given context */
  getAvailableResources: (context?: RequestContext) => Promise<
    Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }>
  >;
  /** Get all available prompts for a given context */
  getAvailablePrompts: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
    }>
  >;
}

/**
 * Enhanced server creation options with dynamic handler support
 */
export interface EnhancedServerCreationOptions<TClient = unknown>
  extends Omit<
    ServerCreationOptions<TClient>,
    "toolHandlers" | "resourceHandlers" | "promptHandlers"
  > {
  /** Server key for database lookup (e.g., "linear", "perplexity", "devtools") */
  serverKey?: string;
  /** Dynamic handler registry for organization-specific handlers */
  dynamicHandlers?: DynamicHandlerRegistry;
  /** Fallback static handlers for backward compatibility */
  fallbackHandlers?: {
    toolHandlers: Record<string, ToolHandler>;
    resourceHandlers: Record<string, ResourceHandler>;
    promptHandlers: Record<string, PromptHandler>;
  };
}
