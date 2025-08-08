import { ToolInputSchema } from "./types.js";

// ============================================================================
// PERPLEXITY MCP SERVER - Input Schemas
// ============================================================================

export const PerplexityInputSchemas = {
  search: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query for Perplexity AI" },
      model: {
        type: "string",
        enum: ["sonar", "sonar-pro", "sonar-reasoning-pro"],
      },
      max_tokens: { type: "number", minimum: 1, maximum: 8000 },
      temperature: { type: "number", minimum: 0, maximum: 2 },
      search_recency_filter: {
        type: "string",
        enum: ["month", "week", "day", "hour"],
      },
      return_images: { type: "boolean" },
      search_domain_filter: { type: "array", items: { type: "string" } },
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,
  research: {
    type: "object",
    properties: {
      topic: { type: "string" },
      depth: { type: "string", enum: ["basic", "detailed", "comprehensive"] },
      focus_areas: { type: "array", items: { type: "string" } },
      exclude_domains: { type: "array", items: { type: "string" } },
      recency: { type: "string", enum: ["month", "week", "day", "hour"] },
    },
    required: ["topic"],
    additionalProperties: false,
  } as ToolInputSchema,
  compare: {
    type: "object",
    properties: {
      items: { type: "array", items: { type: "string" } },
      criteria: { type: "array", items: { type: "string" } },
      format: { type: "string", enum: ["table", "prose", "list"] },
    },
    required: ["items"],
    additionalProperties: false,
  } as ToolInputSchema,
  summarize: {
    type: "object",
    properties: {
      content: { type: "string" },
      length: { type: "string", enum: ["brief", "medium", "detailed"] },
      format: { type: "string", enum: ["bullets", "paragraphs", "outline"] },
    },
    required: ["content"],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
