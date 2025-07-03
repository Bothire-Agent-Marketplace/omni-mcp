import { LinearClient } from "@linear/sdk";
import * as handlers from "./handlers.js";

// Tool handler function type
export type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{
    type: "text";
    text: string;
  }>;
}>;

// Tool definition interface
export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
}

// Create tool handlers with bound LinearClient
export function createToolHandlers(
  linearClient: LinearClient
): Record<string, ToolHandler> {
  return {
    linear_search_issues: (params) =>
      handlers.handleLinearSearchIssues(linearClient, params),
    linear_get_teams: (params) =>
      handlers.handleLinearGetTeams(linearClient, params),
    linear_get_users: (params) =>
      handlers.handleLinearGetUsers(linearClient, params),
    linear_get_projects: (params) =>
      handlers.handleLinearGetProjects(linearClient, params),
    linear_get_issue: (params) =>
      handlers.handleLinearGetIssue(linearClient, params),
  };
}

// Tool metadata and descriptions
export const TOOL_DEFINITIONS: Record<
  string,
  Omit<ToolDefinition, "handler">
> = {
  linear_search_issues: {
    name: "linear_search_issues",
    description: "Search for Linear issues with optional filters",
  },
  linear_get_teams: {
    name: "linear_get_teams",
    description: "Retrieve all teams in the Linear workspace",
  },
  linear_get_users: {
    name: "linear_get_users",
    description: "Retrieve users in the Linear workspace",
  },
  linear_get_projects: {
    name: "linear_get_projects",
    description: "Retrieve projects in the Linear workspace",
  },
  linear_get_issue: {
    name: "linear_get_issue",
    description: "Get detailed information about a specific Linear issue",
  },
};

// Get all available tools with metadata
export function getAvailableTools(): Array<{
  name: string;
  description: string;
}> {
  return Object.values(TOOL_DEFINITIONS);
}

// Get tool description by name
export function getToolDescription(name: string): string {
  return TOOL_DEFINITIONS[name]?.description || "Linear tool";
}
