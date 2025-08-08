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
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createToolHandlers = (/* notionClient: NotionClient */) =>
  createGenericToolHandlers(notionToolDefinitions, {} /* notionClient */);

export const getAvailableTools = () =>
  getGenericAvailableTools(notionToolDefinitions);
