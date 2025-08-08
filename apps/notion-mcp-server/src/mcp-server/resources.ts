// ============================================================================
// NOTION MCP SERVER - Resources
// ============================================================================

import {
  createGenericResourceHandlers,
  getGenericAvailableResources,
  ResourceDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// TODO: Replace with your actual notion SDK/API client
// import { NotionClient } from "@notion/sdk";

// ============================================================================
// NOTION MCP SERVER - Resource Definitions
// ============================================================================

const notionResourceDefinitions: Record<
  string,
  ResourceDefinition<unknown /* NotionClient */>
> = {
  "notion://items": {
    handler: handlers.handleNotionItemsResource,
    metadata: {
      uri: "notion://items",
      name: "notion-items",
      description: "Access to notion items",
      mimeType: "application/json",
    },
  },
  "notion://projects": {
    handler: handlers.handleNotionProjectsResource,
    metadata: {
      uri: "notion://projects",
      name: "notion-projects",
      description: "Access to notion projects",
      mimeType: "application/json",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createResourceHandlers = (/* notionClient: NotionClient */) =>
  createGenericResourceHandlers(
    notionResourceDefinitions,
    {} /* notionClient */
  );

export const getAvailableResources = () =>
  getGenericAvailableResources(notionResourceDefinitions);
