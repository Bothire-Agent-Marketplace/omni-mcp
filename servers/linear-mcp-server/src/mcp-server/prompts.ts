import { LINEAR_PROMPTS, PromptDefinition } from "@mcp/schemas";

// Use standardized prompt definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const PROMPTS: readonly PromptDefinition[] = LINEAR_PROMPTS;
