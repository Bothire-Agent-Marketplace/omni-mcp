import { CommonInputSchemas } from "./common.js";
import { ToolInputSchema } from "./types.js";

export const LinearInputSchemas = {
  searchIssues: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Free-text search. Supports identifiers like TEAM-123 and numeric IDs",
      },
      teamId: { type: "string" },
      teamIds: { type: "array", items: { type: "string" } },
      stateId: { type: "string" },
      stateIds: { type: "array", items: { type: "string" } },
      status: { type: "string" },
      assigneeId: { type: "string" },
      assigneeIds: { type: "array", items: { type: "string" } },
      labelIds: { type: "array", items: { type: "string" } },
      projectId: { type: "string" },
      cycleId: { type: "string" },
      includeArchived: { type: "boolean", default: false },
      priority: { type: "number", minimum: 0, maximum: 4 },
      createdAtFrom: { type: "string", format: "date-time" },
      createdAtTo: { type: "string", format: "date-time" },
      updatedAtFrom: { type: "string", format: "date-time" },
      updatedAtTo: { type: "string", format: "date-time" },
      limit: CommonInputSchemas.optionalLimit,
      cursor: { type: "string", description: "Pagination cursor" },
      sortBy: {
        type: "string",
        enum: ["updated", "created", "priority"],
        default: "updated",
      },
      sortOrder: CommonInputSchemas.sortOrder,
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

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
