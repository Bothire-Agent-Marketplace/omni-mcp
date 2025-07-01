// Core MCP Types - Must be used by all MCP servers
export * from "./mcp/types.js";

// Re-export commonly used types for convenience
export type {
  Tool,
  Resource,
  Prompt,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
  McpResponse,
  McpSuccessResponse,
  McpErrorResponse,
  McpServerInterface,
} from "./mcp/types.js";
