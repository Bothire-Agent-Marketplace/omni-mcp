// Core MCP Types - Must be used by all MCP servers
export * from "./mcp/types.js";

// Linear-specific types
export * from "./linear/mcp-types.js";
export * from "./linear/issue.js";

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

export type {
  LinearIssue,
  LinearTeam,
  LinearProject,
  LinearWorkflowState,
  LinearUser,
  SearchIssuesArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
  LinearSearchResponse,
} from "./linear/mcp-types.js";

export {
  LINEAR_TOOLS,
  LINEAR_RESOURCES,
  LINEAR_PROMPTS,
} from "./linear/mcp-types.js";
