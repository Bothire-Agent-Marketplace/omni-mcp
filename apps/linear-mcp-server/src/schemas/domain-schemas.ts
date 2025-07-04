import { z } from "zod";

// ============================================================================
// MCP Server - Domain-Specific Zod Validation Schemas
// ============================================================================
// This file contains Zod schemas for runtime validation of tool parameters and prompt arguments.
// These schemas are specific to the domain this MCP server serves.
// For Linear: Issues, Teams, Users, Projects, etc.
// For future servers: Replace with relevant domain schemas (GitHub: Repos, Issues, PRs, etc.)
//
// NOTE: These are separate from the inputSchemas in @mcp/schemas which are for MCP protocol.
// These schemas are for internal validation within the server's business logic.

// Tool validation schemas - Update these for your specific domain tools
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

// Prompt validation schemas - Update these for your specific domain prompts
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
