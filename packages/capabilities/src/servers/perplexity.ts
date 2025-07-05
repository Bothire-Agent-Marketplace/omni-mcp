import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

// ============================================================================
// PERPLEXITY MCP SERVER - Definition
// ============================================================================

export const PERPLEXITY_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "perplexity",
  port: 3002,
  description:
    "Perplexity MCP Server for AI-powered search, research, comparison, and summarization",
  productionUrl: "https://perplexity-mcp.vercel.app",
  envVar: "PERPLEXITY_SERVER_URL",
  tools: [
    "perplexity_search",
    "perplexity_research",
    "perplexity_compare",
    "perplexity_summarize",
  ],
  resources: ["perplexity://search-history", "perplexity://models"],
  prompts: ["perplexity_workflow", "perplexity_automation"],
});
