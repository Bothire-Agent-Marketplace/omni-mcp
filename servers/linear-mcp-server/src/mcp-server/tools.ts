import { ToolDefinition } from "@mcp/schemas";
import { LINEAR_TOOLS } from "../types/mcp-types.js";

// Use standardized tool definitions from server-specific types
// This ensures the Linear server owns its tool definitions
export const TOOLS: readonly ToolDefinition[] = LINEAR_TOOLS;
