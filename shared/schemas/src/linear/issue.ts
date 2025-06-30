import { z } from "zod";

// Schema for creating an issue
export const CreateIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  teamId: z.string().min(1, "Team ID is required"),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;

// Schema for the result of creating an issue
export const IssueResultSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  url: z.string(),
});

export type IssueResult = z.infer<typeof IssueResultSchema>;
