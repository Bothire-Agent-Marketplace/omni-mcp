// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Resources
// ============================================================================

import {
  createGenericResourceHandlers,
  getGenericAvailableResources,
  ResourceDefinition,
} from "@mcp/utils";
import type { ChromeDevToolsClient } from "./chrome-client.js";
import * as handlers from "./handlers.js";

// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Resource Definitions
// ============================================================================

const devtoolsResourceDefinitions: Record<
  string,
  ResourceDefinition<ChromeDevToolsClient>
> = {
  "chrome://session": {
    handler: handlers.handleDevtoolsItemsResource,
    metadata: {
      uri: "chrome://session",
      name: "chrome-session",
      description: "Current Chrome debugging session data",
      mimeType: "application/json",
    },
  },
  "chrome://browser": {
    handler: handlers.handleDevtoolsProjectsResource,
    metadata: {
      uri: "chrome://browser",
      name: "chrome-browser",
      description: "Chrome browser instance information",
      mimeType: "application/json",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createResourceHandlers = (chromeClient: ChromeDevToolsClient) =>
  createGenericResourceHandlers(devtoolsResourceDefinitions, chromeClient);

export const getAvailableResources = () =>
  getGenericAvailableResources(devtoolsResourceDefinitions);
