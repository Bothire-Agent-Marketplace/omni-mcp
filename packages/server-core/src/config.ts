import type { McpServerConfig, OrganizationContext } from "@mcp/schemas";
import type { DynamicHandlerRegistry } from "./dynamic-handlers.js";

export type { OrganizationContext };

export interface RequestContext {
  organization?: OrganizationContext;

  userId?: string;

  requestId?: string;
}

export type { McpServerConfig };

export interface ServerCreationOptions<TClient = unknown> {
  serverName: string;

  config: McpServerConfig;

  client?: TClient;

  toolHandlers: Record<string, ToolHandler>;

  resourceHandlers: Record<string, ResourceHandler>;

  promptHandlers: Record<string, PromptHandler>;
}

export interface ServerStartupOptions {
  serverName: string;

  config: McpServerConfig;

  createServer: () => Promise<import("fastify").FastifyInstance>;
}

export type ToolHandler = (
  params: Record<string, unknown>,
  context?: RequestContext
) => Promise<{
  content: Array<{
    type: "text";
    text: string;
  }>;
}>;

export type ResourceHandler = (
  uri: string,
  context?: RequestContext
) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
  }>;
}>;

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

export interface HandlerRegistries {
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

export interface EnhancedServerCreationOptions<TClient = unknown>
  extends Omit<
    ServerCreationOptions<TClient>,
    "toolHandlers" | "resourceHandlers" | "promptHandlers"
  > {
  serverKey?: string;

  dynamicHandlers?: DynamicHandlerRegistry;

  fallbackHandlers?: {
    toolHandlers: Record<string, ToolHandler>;
    resourceHandlers: Record<string, ResourceHandler>;
    promptHandlers: Record<string, PromptHandler>;
  };
}
