import { PerplexityInputSchemas } from "@mcp/schemas";
import {
  createGenericToolHandlers,
  getGenericAvailableTools,
  ToolDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

const perplexityToolDefinitions: Record<string, ToolDefinition<unknown>> = {
  perplexity_search: {
    handler: handlers.handlePerplexitySearch,
    metadata: {
      name: "perplexity_search",
      description:
        "Search the web using Perplexity AI with real-time information and citations",
      inputSchema: PerplexityInputSchemas.search,
    },
  },
  perplexity_research: {
    handler: handlers.handlePerplexityResearch,
    metadata: {
      name: "perplexity_research",
      description:
        "Conduct comprehensive research on a topic using multiple queries and synthesis",
      inputSchema: PerplexityInputSchemas.research,
    },
  },
  perplexity_compare: {
    handler: handlers.handlePerplexityCompare,
    metadata: {
      name: "perplexity_compare",
      description:
        "Compare multiple items, concepts, or entities using current information",
      inputSchema: PerplexityInputSchemas.compare,
    },
  },
  perplexity_summarize: {
    handler: handlers.handlePerplexitySummarize,
    metadata: {
      name: "perplexity_summarize",
      description: "Summarize and analyze content using Perplexity AI",
      inputSchema: PerplexityInputSchemas.summarize,
    },
  },
};

export const createToolHandlers = () =>
  createGenericToolHandlers(perplexityToolDefinitions, {});

export const getAvailableTools = () =>
  getGenericAvailableTools(perplexityToolDefinitions);
