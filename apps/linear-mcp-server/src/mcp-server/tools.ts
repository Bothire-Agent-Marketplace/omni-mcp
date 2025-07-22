import { LinearClient } from "@linear/sdk";
import { LinearInputSchemas } from "@mcp/schemas";
import { ToolHandler } from "@mcp/server-core";
import { getGenericAvailableTools, ToolDefinition } from "@mcp/utils";
import * as handlers from "./handlers.js";

// ============================================================================
// LINEAR MCP SERVER - Tool Definitions
// ============================================================================

const linearToolDefinitions: Record<string, ToolDefinition<LinearClient>> = {
  linear_search_issues: {
    handler: handlers.handleLinearSearchIssues,
    metadata: {
      name: "linear_search_issues",
      description: "Search for Linear issues with optional filters",
      inputSchema: LinearInputSchemas.searchIssues,
    },
  },
  linear_get_teams: {
    handler: handlers.handleLinearGetTeams,
    metadata: {
      name: "linear_get_teams",
      description: "Retrieve all teams in the Linear workspace",
      inputSchema: LinearInputSchemas.getTeams,
    },
  },
  linear_get_users: {
    handler: handlers.handleLinearGetUsers,
    metadata: {
      name: "linear_get_users",
      description: "Retrieve users in the Linear workspace",
      inputSchema: LinearInputSchemas.getUsers,
    },
  },
  linear_get_projects: {
    handler: handlers.handleLinearGetProjects,
    metadata: {
      name: "linear_get_projects",
      description: "Retrieve projects in the Linear workspace",
      inputSchema: LinearInputSchemas.getProjects,
    },
  },
  linear_get_issue: {
    handler: handlers.handleLinearGetIssue,
    metadata: {
      name: "linear_get_issue",
      description: "Get detailed information about a specific Linear issue",
      inputSchema: LinearInputSchemas.getIssueDetails,
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export function createToolHandlers(
  linearClient: LinearClient | undefined
): Record<string, ToolHandler> {
  if (!linearClient) {
    return {};
  }
  return {
    linear_get_teams: handlers.handleLinearGetTeams.bind(null, linearClient),
    linear_get_users: handlers.handleLinearGetUsers.bind(null, linearClient),
    linear_get_projects: handlers.handleLinearGetProjects.bind(
      null,
      linearClient
    ),
    linear_search_issues: handlers.handleLinearSearchIssues.bind(
      null,
      linearClient
    ),
  };
}

export const getAvailableTools = () =>
  getGenericAvailableTools(linearToolDefinitions);
