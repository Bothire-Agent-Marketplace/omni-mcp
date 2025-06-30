import { z } from "zod";
import {
  Tool,
  Resource,
  Prompt,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
  McpResponse,
  ToolSchema,
  ResourceSchema,
  PromptSchema,
} from "../mcp/types.js";

// ============================================================================
// LINEAR-SPECIFIC MCP TYPES
// ============================================================================

// Linear Issue Types
export const LinearIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.number().min(0).max(4),
  state: z.string().optional(),
  assignee: z.string().optional(),
  team: z.string().optional(),
  url: z.string().url(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LinearTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().optional(),
});

export const LinearProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  teamId: z.string(),
  state: z.string(),
});

export const LinearWorkflowStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  teamId: z.string(),
});

export const LinearUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  email: z.string().email(),
  active: z.boolean(),
});

export type LinearIssue = z.infer<typeof LinearIssueSchema>;
export type LinearTeam = z.infer<typeof LinearTeamSchema>;
export type LinearProject = z.infer<typeof LinearProjectSchema>;
export type LinearWorkflowState = z.infer<typeof LinearWorkflowStateSchema>;
export type LinearUser = z.infer<typeof LinearUserSchema>;

// Linear Tool Argument Types
export const SearchIssuesArgsSchema = z.object({
  query: z.string().optional(),
  teamId: z.string().optional(),
  status: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  limit: z.number().min(1).max(50).default(10),
});

export const CreateIssueArgsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string().min(1),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  labelIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  estimate: z.number().min(0).optional(),
});

export const UpdateIssueArgsSchema = z.object({
  issueId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  stateId: z.string().optional(),
  estimate: z.number().min(0).optional(),
});

export type SearchIssuesArgs = z.infer<typeof SearchIssuesArgsSchema>;
export type CreateIssueArgs = z.infer<typeof CreateIssueArgsSchema>;
export type UpdateIssueArgs = z.infer<typeof UpdateIssueArgsSchema>;

// Linear Response Types
export type LinearSearchResponse = McpResponse<{
  issues: LinearIssue[];
  count: number;
  query: SearchIssuesArgs;
}>;

export type LinearTeamsResponse = McpResponse<{
  teams: LinearTeam[];
}>;

export type LinearProjectsResponse = McpResponse<{
  projects: LinearProject[];
}>;

export type LinearWorkflowStatesResponse = McpResponse<{
  states: LinearWorkflowState[];
}>;

export type LinearUsersResponse = McpResponse<{
  users: LinearUser[];
}>;

// Linear Tool Definitions (using readonly-compatible type)
export const LINEAR_TOOLS: readonly ToolDefinition[] = [
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

// Linear Resource Definitions (using readonly-compatible type)
export const LINEAR_RESOURCES: readonly ResourceDefinition[] = [
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

// Linear Prompt Definitions (using readonly-compatible type)
export const LINEAR_PROMPTS: readonly PromptDefinition[] = [
  {
    name: "create_issue_workflow",
    description:
      "Step-by-step workflow for creating well-structured Linear issues",
    arguments: [
      {
        name: "teamId",
        description: "ID of the team to create the issue for",
        required: false,
      },
      {
        name: "priority",
        description: "Default priority level (0-4)",
        required: false,
      },
    ],
  },
  {
    name: "triage_workflow",
    description:
      "Comprehensive workflow for triaging and prioritizing Linear issues",
    arguments: [],
  },
  {
    name: "sprint_planning",
    description: "Sprint planning workflow using Linear issues and cycles",
    arguments: [
      {
        name: "teamId",
        description: "ID of the team for sprint planning",
        required: false,
      },
      {
        name: "sprintDuration",
        description: "Duration of the sprint in weeks",
        required: false,
      },
    ],
  },
] as const;
