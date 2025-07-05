import { CommonInputSchemas } from "./common.js";
import { ToolInputSchema } from "./types.js";

// ============================================================================
// PERPLEXITY MCP SERVER - Input Schemas
// ============================================================================

export const PerplexityInputSchemas = {
  search: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for Perplexity AI",
      },
      model: {
        type: "string",
        enum: ["sonar", "sonar-pro", "sonar-reasoning-pro"],
        description: "Perplexity model to use",
      },
      max_tokens: CommonInputSchemas.optionalMaxTokens,
      temperature: CommonInputSchemas.temperature,
      search_recency_filter: {
        type: "string",
        enum: ["month", "week", "day", "hour"],
        description: "Filter results by recency",
      },
      return_images: {
        type: "boolean",
        description: "Include images in results",
      },
      search_domain_filter: {
        type: "array",
        items: { type: "string" },
        description: "Domains to search within",
      },
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,

  research: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic to research",
      },
      depth: {
        type: "string",
        enum: ["basic", "detailed", "comprehensive"],
        description: "Research depth level",
      },
      focus_areas: {
        type: "array",
        items: { type: "string" },
        description: "Specific areas to focus on",
      },
    },
    required: ["topic"],
    additionalProperties: false,
  } as ToolInputSchema,

  compare: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { type: "string" },
        description: "Items to compare",
      },
      criteria: {
        type: "array",
        items: { type: "string" },
        description: "Comparison criteria",
      },
      format: {
        type: "string",
        enum: ["table", "prose", "list"],
        description: "Output format",
      },
    },
    required: ["items"],
    additionalProperties: false,
  } as ToolInputSchema,

  summarize: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Content to summarize",
      },
      length: {
        type: "string",
        enum: ["brief", "medium", "detailed"],
        description: "Summary length",
      },
      format: {
        type: "string",
        enum: ["bullets", "paragraphs", "outline"],
        description: "Output format",
      },
    },
    required: ["content"],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
