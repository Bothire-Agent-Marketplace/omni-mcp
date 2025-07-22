import { z } from "zod";

// ============================================================================
// CORE MCP TYPES - Must be used by all MCP servers in this project
// ============================================================================

// JSON Schema types for tool parameters
export const JSONSchemaPropertySchema: z.ZodType<JSONSchemaProperty> = z.lazy(
  () =>
    z.object({
      type: z
        .union([
          z.enum([
            "string",
            "number",
            "integer",
            "boolean",
            "array",
            "object",
            "null",
          ]),
          z.array(
            z.enum([
              "string",
              "number",
              "integer",
              "boolean",
              "array",
              "object",
              "null",
            ])
          ),
        ])
        .optional(),
      description: z.string().optional(),
      enum: z.array(z.unknown()).optional(),
      const: z.unknown().optional(),
      default: z.unknown().optional(),
      examples: z.array(z.unknown()).optional(),
      // String constraints
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      format: z.string().optional(),
      // Number constraints
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      exclusiveMinimum: z.number().optional(),
      exclusiveMaximum: z.number().optional(),
      multipleOf: z.number().optional(),
      // Array constraints
      items: JSONSchemaPropertySchema.optional(),
      minItems: z.number().optional(),
      maxItems: z.number().optional(),
      uniqueItems: z.boolean().optional(),
      // Object constraints
      properties: z.record(JSONSchemaPropertySchema).optional(),
      required: z.array(z.string()).optional(),
      additionalProperties: z
        .union([z.boolean(), JSONSchemaPropertySchema])
        .optional(),
      minProperties: z.number().optional(),
      maxProperties: z.number().optional(),
    })
);

export type JSONSchemaProperty = {
  type?:
    | (
        | "string"
        | "number"
        | "integer"
        | "boolean"
        | "array"
        | "object"
        | "null"
      )
    | (
        | "string"
        | "number"
        | "integer"
        | "boolean"
        | "array"
        | "object"
        | "null"
      )[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  items?: JSONSchemaProperty;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
  minProperties?: number;
  maxProperties?: number;
};

// Tool Types
export const ToolArgumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  properties: z.record(JSONSchemaPropertySchema).optional(),
  items: JSONSchemaPropertySchema.optional(),
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
    properties: z.record(JSONSchemaPropertySchema),
    required: z.array(z.string()).optional(),
  }),
});

export type ToolArgument = z.infer<typeof ToolArgumentSchema>;
export type Tool = z.infer<typeof ToolSchema>;

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

// Re-export unified response types from API layer
export type {
  McpSuccessResponse,
  McpErrorResponse,
  McpResponse,
} from "../api/index.js";

export {
  McpSuccessResponseSchema,
  McpErrorResponseSchema,
  McpResponseSchema,
} from "../api/index.js";

// Server configuration schema moved to packages/schemas/src/mcp/configuration.ts
// Import McpServerConfig and McpServerConfigSchema from @mcp/schemas instead
