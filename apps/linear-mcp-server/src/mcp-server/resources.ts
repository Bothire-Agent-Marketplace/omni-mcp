import { LinearClient } from "@linear/sdk";
import {
  createGenericResourceHandlers,
  getGenericAvailableResources,
  ResourceDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// ============================================================================
// LINEAR MCP SERVER - Resource Definitions
// ============================================================================

const linearResourceDefinitions: Record<
  string,
  ResourceDefinition<LinearClient>
> = {
  "linear://teams": {
    handler: handlers.handleLinearTeamsResource,
    metadata: {
      uri: "linear://teams",
      name: "linear-teams",
      description: "List of all Linear teams",
      mimeType: "application/json",
    },
  },
  "linear://users": {
    handler: handlers.handleLinearUsersResource,
    metadata: {
      uri: "linear://users",
      name: "linear-users",
      description: "List of Linear users for assignment and collaboration",
      mimeType: "application/json",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createResourceHandlers = (linearClient: LinearClient) =>
  createGenericResourceHandlers(linearResourceDefinitions, linearClient);

export const getAvailableResources = () =>
  getGenericAvailableResources(linearResourceDefinitions);
