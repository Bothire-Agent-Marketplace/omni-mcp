import { ToolInputSchema } from "@mcp/schemas";

// ============================================================================
// REUSABLE MCP REGISTRY FUNCTIONS
// ============================================================================
// These functions eliminate boilerplate across all MCP servers by providing
// generic implementations that work with server-specific definitions.

// =============================================================================
// TYPES FOR SERVER DEFINITIONS
// =============================================================================

export interface ToolDefinition<TClient = unknown> {
  handler: (
    client: TClient,
    params: Record<string, unknown>
  ) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }>;
  metadata: {
    name: string;
    description: string;
    inputSchema: ToolInputSchema;
  };
}

export interface ResourceDefinition<TClient = unknown> {
  handler: (
    client: TClient,
    uri: string
  ) => Promise<{
    contents: Array<{
      uri: string;
      text: string;
    }>;
  }>;
  metadata: {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
  };
}

export interface PromptDefinition {
  handler: (args: Record<string, unknown>) => Promise<{
    messages: Array<{
      role: "user" | "assistant";
      content: {
        type: "text";
        text: string;
      };
    }>;
  }>;
  metadata: {
    name: string;
    description: string;
  };
}

// =============================================================================
// GENERIC REGISTRY FUNCTIONS
// =============================================================================

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{
    type: "text";
    text: string;
  }>;
}>;

type ResourceHandler = (uri: string) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
  }>;
}>;

type PromptHandler = (args: Record<string, unknown>) => Promise<{
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}>;

/**
 * Creates tool handlers from tool definitions
 */
export function createGenericToolHandlers<TClient = unknown>(
  definitions: Record<string, ToolDefinition<TClient>>,
  client: TClient
): Record<string, ToolHandler> {
  const handlers: Record<string, ToolHandler> = {};

  for (const [toolName, definition] of Object.entries(definitions)) {
    handlers[toolName] = (params: Record<string, unknown>) =>
      definition.handler(client, params);
  }

  return handlers;
}

/**
 * Gets available tools from tool definitions
 */
export function getGenericAvailableTools<TClient = unknown>(
  definitions: Record<string, ToolDefinition<TClient>>
): Array<{
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}> {
  return Object.values(definitions).map((def) => def.metadata);
}

/**
 * Creates resource handlers from resource definitions
 */
export function createGenericResourceHandlers<TClient = unknown>(
  definitions: Record<string, ResourceDefinition<TClient>>,
  client: TClient
): Record<string, ResourceHandler> {
  const handlers: Record<string, ResourceHandler> = {};

  for (const [resourceUri, definition] of Object.entries(definitions)) {
    handlers[resourceUri] = (uri: string) => definition.handler(client, uri);
  }

  return handlers;
}

/**
 * Gets available resources from resource definitions
 */
export function getGenericAvailableResources<TClient = unknown>(
  definitions: Record<string, ResourceDefinition<TClient>>
): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}> {
  return Object.values(definitions).map((def) => def.metadata);
}

/**
 * Creates prompt handlers from prompt definitions
 */
export function createGenericPromptHandlers(
  definitions: Record<string, PromptDefinition>
): Record<string, PromptHandler> {
  const handlers: Record<string, PromptHandler> = {};

  for (const [promptName, definition] of Object.entries(definitions)) {
    handlers[promptName] = (args: Record<string, unknown>) =>
      definition.handler(args);
  }

  return handlers;
}

/**
 * Gets available prompts from prompt definitions
 */
export function getGenericAvailablePrompts(
  definitions: Record<string, PromptDefinition>
): Array<{
  name: string;
  description: string;
}> {
  return Object.values(definitions).map((def) => def.metadata);
}
