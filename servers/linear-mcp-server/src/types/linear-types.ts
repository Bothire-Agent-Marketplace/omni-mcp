import { z } from "zod";

// ============================================================================
// LINEAR DOMAIN TYPES - Server-specific
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

// Legacy compatibility types (for migration)
export const CreateIssueSchema = CreateIssueArgsSchema;
export const IssueResultSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  url: z.string(),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;
export type IssueResult = z.infer<typeof IssueResultSchema>;
