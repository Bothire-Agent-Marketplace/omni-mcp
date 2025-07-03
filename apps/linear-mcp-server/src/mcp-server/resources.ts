import { LinearClient } from "@linear/sdk";
import * as handlers from "./handlers.js";

// Resource handler function type
export type ResourceHandler = (uri: string) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
  }>;
}>;

// Resource definition interface
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  handler: ResourceHandler;
}

// Create resource handlers with bound LinearClient
export function createResourceHandlers(
  linearClient: LinearClient
): Record<string, ResourceHandler> {
  return {
    "linear://teams": (uri) =>
      handlers.handleLinearTeamsResource(linearClient, uri),
    "linear://users": (uri) =>
      handlers.handleLinearUsersResource(linearClient, uri),
  };
}

// Resource metadata and descriptions
export const RESOURCE_DEFINITIONS: Record<
  string,
  Omit<ResourceDefinition, "handler">
> = {
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

// Get all available resources with metadata
export function getAvailableResources(): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}> {
  return Object.values(RESOURCE_DEFINITIONS);
}

// Get resource name by URI
export function getResourceName(uri: string): string {
  return RESOURCE_DEFINITIONS[uri]?.name || uri;
}

// Get resource description by URI
export function getResourceDescription(uri: string): string {
  return RESOURCE_DEFINITIONS[uri]?.description || "Linear resource";
}
