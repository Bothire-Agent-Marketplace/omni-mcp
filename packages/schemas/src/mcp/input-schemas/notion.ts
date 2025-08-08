import { CommonInputSchemas } from "./common.js";
import { ToolInputSchema } from "./types.js";

// ============================================================================
// NOTION MCP SERVER - Input Schemas
// ============================================================================

export const NotionInputSchemas = {
  searchItems: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for notion items",
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
        description: "ID of the notion item to retrieve",
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
        description: "Title for the new notion item",
      },
      description: {
        type: "string",
        description: "Description for the new notion item",
      },
    },
    required: ["title"],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
