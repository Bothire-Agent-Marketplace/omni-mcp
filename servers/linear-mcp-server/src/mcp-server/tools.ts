import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  // Handlers
  handleLinearSearchIssues,
  handleLinearGetTeams,
  handleLinearGetUsers,
  handleLinearGetProjects,
  handleLinearGetIssue,

  // Schemas
  SearchIssuesInputSchema,
  GetTeamsInputSchema,
  GetUsersInputSchema,
  GetProjectsInputSchema,
  GetIssueInputSchema,
} from "./handlers.js";

// This object centralizes the metadata for all tools.
const ToolMetadata = {
  linear_search_issues: {
    title: "Search Linear Issues",
    description: "Search for Linear issues with optional filters",
    inputSchema: SearchIssuesInputSchema.shape,
  },
  linear_get_teams: {
    title: "Get Linear Teams",
    description: "Retrieve all teams in the Linear workspace",
    inputSchema: GetTeamsInputSchema.shape,
  },
  linear_get_users: {
    title: "Get Linear Users",
    description: "Retrieve users in the Linear workspace",
    inputSchema: GetUsersInputSchema.shape,
  },
  linear_get_projects: {
    title: "Get Linear Projects",
    description: "Retrieve projects in the Linear workspace",
    inputSchema: GetProjectsInputSchema.shape,
  },
  linear_get_issue: {
    title: "Get Linear Issue Details",
    description: "Get detailed information about a specific Linear issue",
    inputSchema: GetIssueInputSchema.shape,
  },
};

export function setupLinearTools(server: McpServer) {
  // Register all tools using a loop for consistency and maintainability.
  server.registerTool(
    "linear_search_issues",
    ToolMetadata.linear_search_issues,
    handleLinearSearchIssues
  );
  server.registerTool(
    "linear_get_teams",
    ToolMetadata.linear_get_teams,
    handleLinearGetTeams
  );
  server.registerTool(
    "linear_get_users",
    ToolMetadata.linear_get_users,
    handleLinearGetUsers
  );
  server.registerTool(
    "linear_get_projects",
    ToolMetadata.linear_get_projects,
    handleLinearGetProjects
  );
  server.registerTool(
    "linear_get_issue",
    ToolMetadata.linear_get_issue,
    handleLinearGetIssue
  );
}
