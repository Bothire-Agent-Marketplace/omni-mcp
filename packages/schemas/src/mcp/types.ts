import { z } from "zod";

// ============================================================================
// CORE MCP TYPES - Must be used by all MCP servers in this project
// ============================================================================

// JSON Schema types for tool parameters
export type JSONSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object"
  | "null";

export interface JSONSchemaProperty {
  type?: JSONSchemaType | JSONSchemaType[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  // Array constraints
  items?: JSONSchemaProperty;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  // Object constraints
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
  minProperties?: number;
  maxProperties?: number;
}

// Tool Types
export const ToolArgumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  properties: z.record(z.unknown()).optional(),
  items: z.unknown().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  default: z.unknown().optional(),
  format: z.string().optional(),
});

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional(),
  }),
});

export type ToolArgument = z.infer<typeof ToolArgumentSchema>;
export type Tool = z.infer<typeof ToolSchema>;

// Extended types that accept readonly arrays for const definitions
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, JSONSchemaProperty>;
    required?: readonly string[];
  };
}

// Resource Types
export const ResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string(),
  mimeType: z.string(),
});

export const ResourceContentSchema = z.object({
  uri: z.string(),
  mimeType: z.string(),
  text: z.string().optional(),
  blob: z.string().optional(), // base64 encoded
});

export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceContent = z.infer<typeof ResourceContentSchema>;

// Extended types that accept readonly arrays for const definitions
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// Prompt Types
export const PromptArgumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean(),
});

export const PromptMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
});

export const PromptSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z.array(PromptArgumentSchema).optional().default([]),
});

export const PromptResponseSchema = z.object({
  description: z.string(),
  messages: z.array(PromptMessageSchema),
});

export type PromptArgument = z.infer<typeof PromptArgumentSchema>;
export type PromptMessage = z.infer<typeof PromptMessageSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type PromptResponse = z.infer<typeof PromptResponseSchema>;

// Extended types that accept readonly arrays for const definitions
export interface PromptArgumentDefinition {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: readonly PromptArgumentDefinition[];
}

// Response Types
export const McpSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  timestamp: z.string().optional(),
  executionTime: z.number().optional(),
});

export const McpErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  timestamp: z.string().optional(),
  executionTime: z.number().optional(),
});

export const McpResponseSchema = z.union([
  McpSuccessResponseSchema,
  McpErrorResponseSchema,
]);

export type McpSuccessResponse<T = unknown> = {
  success: true;
  data: T;
  timestamp?: string;
  executionTime?: number;
};

export type McpErrorResponse = {
  success: false;
  error: string;
  timestamp?: string;
  executionTime?: number;
};

export type McpResponse<T = unknown> = McpSuccessResponse<T> | McpErrorResponse;

// Server Configuration Types
export const McpServerConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  capabilities: z.object({
    tools: z.boolean().optional().default(false),
    resources: z.boolean().optional().default(false),
    prompts: z.boolean().optional().default(false),
  }),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// Tool Implementation Interface
export interface ToolImplementation {
  [key: string]: (args: Record<string, unknown>) => Promise<McpResponse>;
}

// Server Interface that all MCP servers must implement
export interface McpServerInterface {
  name: string;
  version: string;
  tools?: Tool[];
  resources?: Resource[];
  prompts?: Prompt[];
  executeTools?: ToolImplementation;
}
