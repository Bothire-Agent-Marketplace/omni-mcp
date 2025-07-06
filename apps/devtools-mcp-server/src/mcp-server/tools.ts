// ============================================================================
// DEVTOOLS MCP SERVER - Tools
// ============================================================================

import { DevtoolsInputSchemas } from "@mcp/schemas";
import {
  createGenericToolHandlers,
  getGenericAvailableTools,
  ToolDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// TODO: Replace with your actual devtools SDK/API client
// import { DevtoolsClient } from "@devtools/sdk";

// ============================================================================
// DEVTOOLS MCP SERVER - Tool Definitions
// ============================================================================

const devtoolsToolDefinitions: Record<
  string,
  ToolDefinition<unknown /* DevtoolsClient */>
> = {
  devtools_search_items: {
    handler: handlers.handleDevtoolsSearchItems,
    metadata: {
      name: "devtools_search_items",
      description: "Search for devtools items",
      inputSchema: DevtoolsInputSchemas.searchItems,
    },
  },
  devtools_get_item: {
    handler: handlers.handleDevtoolsGetItem,
    metadata: {
      name: "devtools_get_item",
      description: "Get a specific devtools item by ID",
      inputSchema: DevtoolsInputSchemas.getItem,
    },
  },
  devtools_create_item: {
    handler: handlers.handleDevtoolsCreateItem,
    metadata: {
      name: "devtools_create_item",
      description: "Create a new devtools item",
      inputSchema: DevtoolsInputSchemas.createItem,
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createToolHandlers = (/* devtoolsClient: DevtoolsClient */) =>
  createGenericToolHandlers(devtoolsToolDefinitions, {} /* devtoolsClient */);

export const getAvailableTools = () =>
  getGenericAvailableTools(devtoolsToolDefinitions);
