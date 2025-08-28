import { z } from "zod";

export const SearchIssuesInputSchema = z.object({
  query: z.string().min(1).max(500).optional(),
  teamId: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
  stateId: z.string().optional(),
  stateIds: z.array(z.string()).optional(),
  status: z.string().optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  cycleId: z.string().optional(),
  includeArchived: z.boolean().optional().default(false),
  priority: z.number().min(0).max(4).optional(),
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
  updatedAtFrom: z.string().datetime().optional(),
  updatedAtTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(50).default(25),
  cursor: z.string().optional(),
  sortBy: z
    .enum(["updated", "created", "priority"])
    .optional()
    .default("updated"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const GetTeamsInputSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).default(20),
});

export const GetUsersInputSchema = z.object({
  includeDisabled: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).default(20),
});

export const GetProjectsInputSchema = z.object({
  teamId: z.string().optional(),
  includeArchived: z.boolean().optional().default(false),
  limit: z.number().min(1).max(50).default(20),
});

export const GetIssueInputSchema = z.object({
  issueId: z.string().optional(),
  identifier: z.string().optional(),
});
