import { PromptDefinition } from "@mcp/schemas";
import { LINEAR_PROMPTS } from "../types/mcp-types.js";

// Use standardized prompt definitions from server-specific types
// This ensures the Linear server owns its prompt definitions
export const PROMPTS: readonly PromptDefinition[] = LINEAR_PROMPTS;
