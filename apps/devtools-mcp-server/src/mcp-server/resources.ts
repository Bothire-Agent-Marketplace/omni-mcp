// ============================================================================
// DEVTOOLS MCP SERVER - Resources
// ============================================================================

import {
  createGenericResourceHandlers,
  getGenericAvailableResources,
  ResourceDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// TODO: Replace with your actual devtools SDK/API client
// import { DevtoolsClient } from "@devtools/sdk";

// ============================================================================
// DEVTOOLS MCP SERVER - Resource Definitions
// ============================================================================

const devtoolsResourceDefinitions: Record<
  string,
  ResourceDefinition<unknown /* DevtoolsClient */>
> = {
  "devtools://items": {
    handler: handlers.handleDevtoolsItemsResource,
    metadata: {
      uri: "devtools://items",
      name: "devtools-items",
      description: "Access to devtools items",
      mimeType: "application/json",
    },
  },
  "devtools://projects": {
    handler: handlers.handleDevtoolsProjectsResource,
    metadata: {
      uri: "devtools://projects",
      name: "devtools-projects",
      description: "Access to devtools projects",
      mimeType: "application/json",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createResourceHandlers = (/* devtoolsClient: DevtoolsClient */) =>
  createGenericResourceHandlers(
    devtoolsResourceDefinitions,
    {} /* devtoolsClient */
  );

export const getAvailableResources = () =>
  getGenericAvailableResources(devtoolsResourceDefinitions);
