import { LinearClient } from "@linear/sdk";
import * as handlers from "./handlers.js";

// Create resource handlers with bound LinearClient
export function createResourceHandlers(linearClient: LinearClient): Record<
  string,
  (uri: string) => Promise<{
    contents: Array<{
      uri: string;
      text: string;
    }>;
  }>
> {
  return {
    "linear://teams": (uri) =>
      handlers.handleLinearTeamsResource(linearClient, uri),
    "linear://users": (uri) =>
      handlers.handleLinearUsersResource(linearClient, uri),
  };
}

// Get all available resources with metadata
export function getAvailableResources(): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}> {
  const resourceDefinitions = {
    "linear://teams": {
      uri: "linear://teams",
      name: "linear-teams",
      description: "List of all Linear teams",
      mimeType: "application/json",
    },
    "linear://users": {
      uri: "linear://users",
      name: "linear-users",
      description: "List of Linear users for assignment and collaboration",
      mimeType: "application/json",
    },
  };

  return Object.values(resourceDefinitions);
}
