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
  query: z.string().describe("Text to search in item titles and descriptions"),
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
  description: z
    .string()
    .optional()
    .describe("Description for the new devtools item"),
});

// Prompt validation schemas - Update these for your specific prompts
export const DevtoolsWorkflowArgsSchema = z.object({
  task: z.string().optional().describe("Specific devtools task to help with"),
});

export const DevtoolsAutomationArgsSchema = z.object({
  action: z
    .string()
    .optional()
    .describe("Specific devtools action to automate"),
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

// ============================================================================
// STORAGE INSPECTION SCHEMAS
// ============================================================================

export const GetLocalStorageSchema = z.object({
  origin: z
    .string()
    .optional()
    .describe("Origin to get localStorage for (defaults to current page)"),
});

export const GetSessionStorageSchema = z.object({
  origin: z
    .string()
    .optional()
    .describe("Origin to get sessionStorage for (defaults to current page)"),
});

export const GetCookiesSchema = z.object({
  domain: z
    .string()
    .optional()
    .describe("Domain to get cookies for (defaults to current page)"),
});

// ============================================================================
// ADVANCED DOM MANIPULATION SCHEMAS
// ============================================================================

export const SetElementTextSchema = z.object({
  nodeId: z.number().describe("DOM node ID to set text for"),
  text: z.string().describe("Text content to set"),
});

export const SetElementAttributeSchema = z.object({
  nodeId: z.number().describe("DOM node ID to set attribute for"),
  name: z.string().describe("Attribute name"),
  value: z.string().describe("Attribute value"),
});

export const RemoveElementSchema = z.object({
  nodeId: z.number().describe("DOM node ID to remove"),
});

export const GetElementStylesSchema = z.object({
  nodeId: z.number().describe("DOM node ID to get styles for"),
});

export const SetElementStyleSchema = z.object({
  nodeId: z.number().describe("DOM node ID to set style for"),
  property: z.string().describe("CSS property name"),
  value: z.string().describe("CSS property value"),
});

// ============================================================================
// DEBUGGING TOOLS SCHEMAS
// ============================================================================

export const SetBreakpointSchema = z.object({
  url: z.string().describe("URL of the script to set breakpoint in"),
  lineNumber: z.number().describe("Line number to set breakpoint at"),
  columnNumber: z.number().optional().describe("Column number (optional)"),
  condition: z.string().optional().describe("Breakpoint condition (optional)"),
});

export const RemoveBreakpointSchema = z.object({
  breakpointId: z.string().describe("ID of the breakpoint to remove"),
});

export const EvaluateExpressionSchema = z.object({
  expression: z.string().describe("JavaScript expression to evaluate"),
  objectGroup: z.string().optional().describe("Object group for cleanup"),
  includeCommandLineAPI: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include command line API"),
  silent: z
    .boolean()
    .optional()
    .default(false)
    .describe("Don't throw on side effects"),
  contextId: z.number().optional().describe("Execution context ID"),
  returnByValue: z
    .boolean()
    .optional()
    .default(true)
    .describe("Return result by value"),
  generatePreview: z
    .boolean()
    .optional()
    .default(false)
    .describe("Generate object preview"),
});

export const GetCallStackSchema = z.object({
  maxDepth: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum stack depth to retrieve"),
});

export const StepOverSchema = z.object({});

export const StepIntoSchema = z.object({});

export const StepOutSchema = z.object({});

export const ResumeExecutionSchema = z.object({});

export const PauseExecutionSchema = z.object({});

// ============================================================================
// ERROR HANDLING SCHEMAS
// ============================================================================

export const GetRuntimeErrorsSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum number of errors to return"),
  since: z
    .number()
    .optional()
    .describe("Timestamp to get errors since (optional)"),
});

export const GetNetworkErrorsSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum number of errors to return"),
  since: z
    .number()
    .optional()
    .describe("Timestamp to get errors since (optional)"),
});

export const GetConsoleErrorsSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum number of errors to return"),
  level: z
    .enum(["error", "warn", "all"])
    .optional()
    .default("error")
    .describe("Error level filter"),
  since: z
    .number()
    .optional()
    .describe("Timestamp to get errors since (optional)"),
});

export const ClearErrorsSchema = z.object({
  type: z
    .enum(["runtime", "network", "console", "all"])
    .optional()
    .default("all")
    .describe("Type of errors to clear"),
});

export const SetErrorListenerSchema = z.object({
  enabled: z.boolean().describe("Enable or disable error listening"),
  types: z
    .array(z.enum(["runtime", "network", "console"]))
    .optional()
    .default(["runtime", "network", "console"])
    .describe("Types of errors to listen for"),
});
