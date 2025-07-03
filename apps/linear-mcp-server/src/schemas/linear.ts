import { z } from "zod";

// ============================================================================
// Linear MCP Server - Zod Validation Schemas
// ============================================================================
// These are Zod schemas used for runtime validation in tool execution and prompt parameters

// Tool validation schemas
export const SearchIssuesInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Text to search in issue titles and descriptions"),
  teamId: z.string().optional().describe("Filter by team ID"),
  status: z.string().optional().describe("Filter by issue status/state name"),
  assigneeId: z.string().optional().describe("Filter by assignee user ID"),
  priority: z
    .number()
    .min(0)
    .max(4)
    .optional()
    .describe(
      "Filter by priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)"
    ),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of issues to return"),
});

export const GetTeamsInputSchema = z.object({
  includeArchived: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include archived teams in results"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of teams to return"),
});

export const GetUsersInputSchema = z.object({
  includeDisabled: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include disabled users in results"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of users to return"),
});

export const GetProjectsInputSchema = z.object({
  teamId: z.string().optional().describe("Filter projects by team"),
  includeArchived: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include archived projects"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of projects to return"),
});

export const GetIssueInputSchema = z.object({
  issueId: z
    .string()
    .optional()
    .describe("Issue ID (either issueId or identifier required)"),
  identifier: z
    .string()
    .optional()
    .describe(
      "Issue identifier like 'TEAM-123' (either issueId or identifier required)"
    ),
});

// Prompt validation schemas (for client UI generation and parameter validation)
export const CreateIssueWorkflowArgsSchema = z.object({
  teamId: z
    .string()
    .optional()
    .describe("ID of the team to create the issue for"),
  priority: z.string().optional().describe("Default priority level (0-4)"),
});

export const SprintPlanningArgsSchema = z.object({
  teamId: z.string().optional().describe("ID of the team for sprint planning"),
  sprintDuration: z
    .string()
    .optional()
    .describe("Duration of the sprint in weeks"),
});
