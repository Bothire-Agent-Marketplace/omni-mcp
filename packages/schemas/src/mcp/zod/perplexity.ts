import { z } from "zod";

export const PerplexitySearchSchema = z.object({
  query: z.string().min(1).max(1000),
  model: z.enum(["sonar", "sonar-pro", "sonar-reasoning-pro"]).optional(),
  max_tokens: z.number().min(1).max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  search_recency_filter: z.enum(["month", "week", "day", "hour"]).optional(),
  return_images: z.boolean().optional(),
  search_domain_filter: z.array(z.string()).optional(),
});

export const ResearchInputSchema = z.object({
  topic: z.string().min(1, "Topic cannot be empty"),
  depth: z.enum(["basic", "detailed", "comprehensive"]).default("basic"),
  focus_areas: z.array(z.string()).optional(),
  exclude_domains: z.array(z.string()).optional(),
  recency: z.enum(["month", "week", "day", "hour"]).default("month"),
});

export const CompareInputSchema = z.object({
  items: z.array(z.string()).min(2, "Need at least 2 items to compare"),
  criteria: z.array(z.string()).optional(),
  format: z.enum(["table", "prose", "list"]).default("prose"),
});

export const SummarizeInputSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  length: z.enum(["brief", "medium", "detailed"]).default("medium"),
  format: z.enum(["bullets", "paragraphs", "outline"]).default("paragraphs"),
});
