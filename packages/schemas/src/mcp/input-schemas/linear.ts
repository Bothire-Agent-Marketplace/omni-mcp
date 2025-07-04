import { CommonInputSchemas } from "./common.js";
import { ToolInputSchema } from "./types.js";

// ============================================================================
// LINEAR MCP SERVER - Input Schemas
// ============================================================================

export const LinearInputSchemas = {
  // Search issues tool
  searchIssues: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for issues (title, description, or ID)",
      },
      limit: CommonInputSchemas.optionalLimit,
      includeArchived: {
        type: "boolean",
        default: false,
        description: "Include archived issues in results",
      },
      teamId: {
        type: "string",
        description: "Filter by specific team ID",
      },
      stateId: {
        type: "string",
        description: "Filter by specific state ID",
      },
      assigneeId: {
        type: "string",
        description: "Filter by specific assignee ID",
      },
      sortBy: {
        type: "string",
        enum: ["created", "updated", "priority"],
        default: "updated",
        description: "Sort issues by field",
      },
      sortOrder: CommonInputSchemas.sortOrder,
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,

  // Get teams tool
  getTeams: {
    type: "object",
    properties: {
      limit: CommonInputSchemas.optionalLimit,
      includeArchived: {
        type: "boolean",
        default: false,
        description: "Include archived teams in results",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // Get users tool
  getUsers: {
    type: "object",
    properties: {
      limit: CommonInputSchemas.optionalLimit,
      includeDeactivated: {
        type: "boolean",
        default: false,
        description: "Include deactivated users in results",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // Get projects tool
  getProjects: {
    type: "object",
    properties: {
      teamId: {
        type: "string",
        description: "Filter projects by team ID",
      },
      includeArchived: {
        type: "boolean",
        default: false,
        description: "Include archived projects",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        default: 20,
        description: "Maximum number of projects to return",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // Get issue details tool
  getIssueDetails: {
    type: "object",
    properties: {
      issueId: {
        type: "string",
        description: "Linear issue ID to retrieve details for",
      },
    },
    required: ["issueId"],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
