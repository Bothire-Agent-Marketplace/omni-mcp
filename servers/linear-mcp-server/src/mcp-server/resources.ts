// TODO: Import from shared schemas once TypeScript path mapping is configured
// import { LINEAR_RESOURCES, Resource } from "@mcp/schemas";

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const RESOURCES: readonly Resource[] = [
  {
    uri: "linear://teams",
    name: "Linear Teams",
    description: "List of all Linear teams with their details",
    mimeType: "application/json",
  },
  {
    uri: "linear://projects/{teamId}",
    name: "Linear Projects",
    description: "List of projects for a specific team",
    mimeType: "application/json",
  },
  {
    uri: "linear://workflow-states/{teamId}",
    name: "Linear Workflow States",
    description: "Available workflow states (issue statuses) for a team",
    mimeType: "application/json",
  },
  {
    uri: "linear://users",
    name: "Linear Users",
    description: "List of Linear users for assignment and collaboration",
    mimeType: "application/json",
  },
] as const;
