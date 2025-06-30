// TODO: Import from shared schemas once TypeScript path mapping is configured
// import { LINEAR_TOOLS } from "@mcp/schemas";

export const TOOLS = [
  {
    name: "linear_search_issues",
    description: "Search for Linear issues with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search in issue titles and descriptions",
        },
        teamId: {
          type: "string",
          description: "Filter by team ID",
        },
        status: {
          type: "string",
          description: "Filter by issue status/state name",
        },
        assigneeId: {
          type: "string",
          description: "Filter by assignee user ID",
        },
        priority: {
          type: "number",
          description:
            "Filter by priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
          minimum: 0,
          maximum: 4,
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (1-50)",
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      },
    },
  },
  {
    name: "linear_create_issue",
    description: "Create a new Linear issue",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Issue title (required)",
        },
        description: {
          type: "string",
          description: "Issue description",
        },
        teamId: {
          type: "string",
          description: "Team ID where the issue will be created (required)",
        },
        assigneeId: {
          type: "string",
          description: "User ID to assign the issue to",
        },
        priority: {
          type: "number",
          description:
            "Issue priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
          minimum: 0,
          maximum: 4,
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of label IDs to apply",
        },
        projectId: {
          type: "string",
          description: "Project ID to associate with",
        },
        estimate: {
          type: "number",
          description: "Story point estimate",
          minimum: 0,
        },
      },
      required: ["title", "teamId"],
    },
  },
] as const;
