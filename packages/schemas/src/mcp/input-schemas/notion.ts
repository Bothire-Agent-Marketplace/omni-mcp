import { CommonInputSchemas } from "./common.js";
import { ToolInputSchema } from "./types.js";

export const NotionInputSchemas = {
  createDatabase: {
    type: "object",
    properties: {
      parentPageId: {
        type: "string",
        description: "The Notion page_id to create the database under",
      },
      title: { type: "string", description: "Database title" },
    },
    required: ["parentPageId", "title"],
    additionalProperties: true,
  } as ToolInputSchema,

  queryDatabase: {
    type: "object",
    properties: {
      databaseId: { type: "string", description: "Target database_id" },
      cursor: { type: "string", description: "Pagination cursor" },
      limit: CommonInputSchemas.optionalLimit,
      sortBy: { type: "string", enum: ["Date"], default: "Date" },
      sortOrder: CommonInputSchemas.sortOrder,
      filter: { type: "object", description: "Raw Notion API filter object" },
    },
    required: ["databaseId"],
    additionalProperties: false,
  } as ToolInputSchema,

  createPage: {
    type: "object",
    properties: {
      databaseId: { type: "string", description: "Target database_id" },
      title: { type: "string", description: "Title value for Title property" },
      date: {
        type: "string",
        description: "ISO date string for Date property",
      },
      ticketId: { type: "string" },
      summary: { type: "string" },
      followUpDate: { type: "string" },
      followUpNeeded: { type: "boolean" },
    },
    required: ["databaseId", "title", "date"],
    additionalProperties: false,
  } as ToolInputSchema,

  updatePageRelations: {
    type: "object",
    properties: {
      pageId: { type: "string" },
      relatedPageIds: { type: "array", items: { type: "string" } },
      propertyName: { type: "string", default: "RelatedTickets" },
    },
    required: ["pageId", "relatedPageIds"],
    additionalProperties: false,
  } as ToolInputSchema,

  search: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: CommonInputSchemas.optionalLimit,
      filter: {
        type: "string",
        enum: ["page", "database"],
        description: "Filter object type",
      },
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,
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
