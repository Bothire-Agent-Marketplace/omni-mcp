import { JSONSchemaProperty } from "../types.js";

// ============================================================================
// SHARED INPUT SCHEMAS - Reusable across all MCP servers
// ============================================================================

// Common parameter types that can be reused across different tools
export const CommonInputSchemas = {
  // Text/String inputs
  requiredString: {
    type: "string",
    description: "Required string parameter",
  } as JSONSchemaProperty,

  optionalString: {
    type: "string",
    description: "Optional string parameter",
  } as JSONSchemaProperty,

  limitedString: (maxLength: number) =>
    ({
      type: "string",
      maxLength,
      description: `String parameter with max length ${maxLength}`,
    }) as JSONSchemaProperty,

  // Number inputs
  positiveInteger: {
    type: "integer",
    minimum: 1,
    description: "Positive integer parameter",
  } as JSONSchemaProperty,

  optionalLimit: {
    type: "number",
    minimum: 1,
    maximum: 100,
    default: 10,
    description: "Optional limit for number of results",
  } as JSONSchemaProperty,

  optionalNumber: {
    type: "number",
  },

  // Boolean inputs
  optionalBoolean: {
    type: "boolean",
    description: "Optional boolean parameter",
  } as JSONSchemaProperty,

  // Common enum patterns
  sortOrder: {
    type: "string",
    enum: ["asc", "desc"],
    default: "desc",
    description: "Sort order for results",
  } as JSONSchemaProperty,

  // Array inputs
  stringArray: {
    type: "array",
    items: {
      type: "string",
    },
    description: "Array of strings",
  } as JSONSchemaProperty,

  // Object inputs
  optionalObject: {
    type: "object",
    additionalProperties: true,
    description: "Optional object parameter",
  } as JSONSchemaProperty,

  optionalMaxTokens: {
    type: "number",
    minimum: 1,
    description: "Optional max tokens for the response",
  },

  temperature: {
    type: "number",
    minimum: 0,
    maximum: 2,
    description: "Optional temperature for the response",
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to create a complete tool inputSchema
 */
export function createToolInputSchema(
  properties: Record<string, JSONSchemaProperty>,
  required: string[] = []
): JSONSchemaProperty {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

/**
 * Helper function to merge common schemas with tool-specific ones
 */
export function mergeSchemas(
  baseSchema: JSONSchemaProperty,
  additionalProperties: Record<string, JSONSchemaProperty>
): JSONSchemaProperty {
  if (baseSchema.type !== "object" || !baseSchema.properties) {
    throw new Error("Base schema must be an object with properties");
  }

  return {
    ...baseSchema,
    properties: {
      ...baseSchema.properties,
      ...additionalProperties,
    },
  };
}

/**
 * Validate that a schema follows MCP inputSchema requirements
 */
export function validateMCPInputSchema(schema: JSONSchemaProperty): boolean {
  // MCP inputSchema must be object type
  if (schema.type !== "object") {
    return false;
  }

  // Must have properties defined
  if (!schema.properties) {
    return false;
  }

  // All properties should be valid JSON Schema
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (!prop.type || typeof key !== "string") {
      return false;
    }
  }

  return true;
}
