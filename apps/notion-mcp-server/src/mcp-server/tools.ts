// ============================================================================
// NOTION MCP SERVER - Tools
// ============================================================================

import { NotionInputSchemas } from "@mcp/schemas";
import {
  createGenericToolHandlers,
  getGenericAvailableTools,
  ToolDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// TODO: Replace with your actual notion SDK/API client
// import { NotionClient } from "@notion/sdk";

// ============================================================================
// NOTION MCP SERVER - Tool Definitions
// ============================================================================

const notionToolDefinitions: Record<
  string,
  ToolDefinition<unknown /* NotionClient */>
> = {
  notion_search_items: {
    handler: handlers.handleNotionSearchItems,
    metadata: {
      name: "notion_search_items",
      description: "Search for notion items",
      inputSchema: NotionInputSchemas.searchItems,
    },
  },
  notion_get_item: {
    handler: handlers.handleNotionGetItem,
    metadata: {
      name: "notion_get_item",
      description: "Get a specific notion item by ID",
      inputSchema: NotionInputSchemas.getItem,
    },
  },
  notion_create_item: {
    handler: handlers.handleNotionCreateItem,
    metadata: {
      name: "notion_create_item",
      description: "Create a new notion item",
      inputSchema: NotionInputSchemas.createItem,
    },
  },
  notion_create_database: {
    handler: handlers.handleNotionCreateDatabase,
    metadata: {
      name: "notion_create_database",
      description: "Create a Notion database under a page",
      inputSchema: NotionInputSchemas.createDatabase,
    },
  },
  notion_query_database: {
    handler: handlers.handleNotionQueryDatabase,
    metadata: {
      name: "notion_query_database",
      description: "Query a Notion database with sort/filter",
      inputSchema: NotionInputSchemas.queryDatabase,
    },
  },
  notion_create_page: {
    handler: handlers.handleNotionCreatePage,
    metadata: {
      name: "notion_create_page",
      description: "Create a page (row) in a Notion database",
      inputSchema: NotionInputSchemas.createPage,
    },
  },
  notion_update_page_relations: {
    handler: handlers.handleNotionUpdatePageRelations,
    metadata: {
      name: "notion_update_page_relations",
      description: "Update a page's relation property with linked page IDs",
      inputSchema: NotionInputSchemas.updatePageRelations,
    },
  },
  notion_search: {
    handler: handlers.handleNotionSearch,
    metadata: {
      name: "notion_search",
      description: "Search for pages or databases in Notion",
      inputSchema: NotionInputSchemas.search,
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createToolHandlers = (/* notionClient: NotionClient */) =>
  createGenericToolHandlers(notionToolDefinitions, {} /* notionClient */);

export const getAvailableTools = () =>
  getGenericAvailableTools(notionToolDefinitions);
