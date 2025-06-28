import { z } from "zod";

// =============================================================================
// Linear MCP Server Schemas with Zod
// =============================================================================

// Search Issues Schema
export const searchIssuesSchema = z.object({
  query: z.string().optional(),
  teamId: z.string().optional(),
  status: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  limit: z.number().min(1).max(50).default(10),
});

export type SearchIssuesInput = z.infer<typeof searchIssuesSchema>;

// Create Issue Schema
export const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  teamId: z.string().min(1, "Team ID is required"),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  labelIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  estimate: z.number().min(0).optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// Update Issue Schema
export const updateIssueSchema = z.object({
  issueId: z.string().min(1, "Issue ID is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  stateId: z.string().optional(),
  estimate: z.number().min(0).optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// Get Teams Schema
export const getTeamsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
});

export type GetTeamsInput = z.infer<typeof getTeamsSchema>;

// Get Projects Schema
export const getProjectsSchema = z.object({
  teamId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export type GetProjectsInput = z.infer<typeof getProjectsSchema>;

// Get Workflow States Schema
export const getWorkflowStatesSchema = z.object({
  teamId: z.string().optional(),
});

export type GetWorkflowStatesInput = z.infer<typeof getWorkflowStatesSchema>;

// Get Issue Schema
export const getIssueSchema = z.object({
  issueId: z.string().min(1, "Issue ID is required"),
});

export type GetIssueInput = z.infer<typeof getIssueSchema>;

// Get Sprint Issues Schema
export const getSprintIssuesSchema = z.object({
  cycleId: z.string().min(1, "Cycle ID is required"),
  limit: z.number().min(1).max(100).default(50),
});

export type GetSprintIssuesInput = z.infer<typeof getSprintIssuesSchema>;

// Get User Schema
export const getUserSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
});

export type GetUserInput = z.infer<typeof getUserSchema>;

// Comment on Issue Schema
export const commentOnIssueSchema = z.object({
  issueId: z.string().min(1, "Issue ID is required"),
  body: z.string().min(1, "Comment body is required"),
});

export type CommentOnIssueInput = z.infer<typeof commentOnIssueSchema>;

// Tool Response Schema
export const linearResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  validationErrors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
        received: z.unknown(),
      })
    )
    .optional(),
  timestamp: z.string(),
  executionTime: z.number(),
});

export type LinearResponse = z.infer<typeof linearResponseSchema>;
