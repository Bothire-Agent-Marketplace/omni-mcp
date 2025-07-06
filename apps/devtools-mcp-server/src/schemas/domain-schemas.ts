import { z } from "zod";

// ============================================================================
// MCP Server - Domain-Specific Zod Validation Schemas
// ============================================================================
// This file contains Zod schemas for runtime validation of tool parameters and prompt arguments.
// These schemas are specific to the domain this MCP server serves.
// For Devtools: Items, Projects, etc.
// For future servers: Replace with relevant domain schemas (GitHub: Repos, Issues, PRs, etc.)
//
// NOTE: These are separate from the inputSchemas in @mcp/schemas which are for MCP protocol.
// These schemas are for internal validation within the server's business logic.

// Tool validation schemas - Update these for your specific domain tools
export const SearchDevtoolsItemsRequestSchema = z.object({
  query: z
    .string()
    .describe("Text to search in item titles and descriptions"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of items to return"),
});

export const GetDevtoolsItemRequestSchema = z.object({
  id: z.string().describe("ID of the devtools item to retrieve"),
});

export const CreateDevtoolsItemRequestSchema = z.object({
  title: z.string().describe("Title for the new devtools item"),
  description: z.string().optional().describe("Description for the new devtools item"),
});

// Prompt validation schemas - Update these for your specific prompts
export const DevtoolsWorkflowArgsSchema = z.object({
  task: z.string().optional().describe("Specific devtools task to help with"),
});

export const DevtoolsAutomationArgsSchema = z.object({
  action: z.string().optional().describe("Specific devtools action to automate"),
});

// ============================================================================
// CSS INSPECTION SCHEMAS
// ============================================================================

export const GetComputedStylesSchema = z.object({
  nodeId: z.number().describe("DOM node ID to get computed styles for"),
});

export const GetCSSRulesSchema = z.object({
  nodeId: z.number().describe("DOM node ID to get CSS rules for"),
});
