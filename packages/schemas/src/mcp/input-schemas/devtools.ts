import { ToolInputSchema } from "./types.js";
import { CommonInputSchemas } from "./common.js";

// ============================================================================
// DEVTOOLS MCP SERVER - Input Schemas
// ============================================================================

export const DevtoolsInputSchemas = {
  searchItems: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for devtools items",
      },
      limit: CommonInputSchemas.optionalLimit,
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,
  
  getItem: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID of the devtools item to retrieve",
      },
    },
    required: ["id"],
    additionalProperties: false,
  } as ToolInputSchema,
  
  createItem: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title for the new devtools item",
      },
      description: {
        type: "string",
        description: "Description for the new devtools item",
      },
    },
    required: ["title"],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
