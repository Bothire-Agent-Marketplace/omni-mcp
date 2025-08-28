import { ToolInputSchema } from "@mcp/schemas";

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

export function getGenericAvailableTools<TClient = unknown>(
  definitions: Record<string, ToolDefinition<TClient>>
): Array<{
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}> {
  return Object.values(definitions).map((def) => def.metadata);
}

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

export function getGenericAvailablePrompts(
  definitions: Record<string, PromptDefinition>
): Array<{
  name: string;
  description: string;
}> {
  return Object.values(definitions).map((def) => def.metadata);
}
