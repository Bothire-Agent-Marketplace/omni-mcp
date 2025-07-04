import { LinearClient } from "@linear/sdk";
import * as handlers from "./handlers.js";

// Create tool handlers with bound LinearClient
export function createToolHandlers(linearClient: LinearClient): Record<
  string,
  (params: Record<string, unknown>) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }>
> {
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

// Get all available tools with metadata
export function getAvailableTools(): Array<{
  name: string;
  description: string;
}> {
  const toolDefinitions = {
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

  return Object.values(toolDefinitions);
}
