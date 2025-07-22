// Export all types, avoiding conflicts by being explicit about new consolidated types
export * from "./gateway/types.js";
export * from "./mcp/types.js";
export * from "./mcp/input-schemas/index.js";
export * from "./organization/context.js";
export * from "./api/index.js";

// Gateway & Session Types
export {
  // HTTP & Request/Response Types
  type HTTPHeaders,
  type HTTPRequestBody,
  type HTTPResponse,
  type GatewayHTTPResponse,
  type MCPRouteGeneric,
  // Unified Session Types
  type BaseSession,
  type Session,
  type DatabaseSession,
  type SessionJwtPayload,
  // WebSocket & Server Types
  type IWebSocket,
  type ServerInstance,
} from "./gateway/types.js";

// 🆕 CONSOLIDATED MCP PROTOCOL TYPES (Primary exports)
export {
  // JSON-RPC Protocol Types (these replace the ones from gateway/types.js)
  type MCPJsonRpcRequest,
  type MCPJsonRpcResponse,
  type MCPJsonRpcSuccessResponse,
  type MCPJsonRpcErrorResponse,
  type MCPJsonRpcError,
  JSON_RPC_ERROR_CODES,
  MCPJsonRpcRequestSchema,
  MCPJsonRpcResponseSchema,
  MCPJsonRpcSuccessResponseSchema,
  MCPJsonRpcErrorResponseSchema,
  MCPJsonRpcErrorSchema,
  // Helper Functions
  createJsonRpcErrorResponse,
  createJsonRpcSuccessResponse,
  createParseErrorResponse,
  createInvalidRequestErrorResponse,
  createMethodNotFoundErrorResponse,
  createInvalidParamsErrorResponse,
  createInternalErrorResponse,
  // Type Guards
  isJsonRpcSuccessResponse,
  isJsonRpcErrorResponse,
  isValidJsonRpcRequest,
} from "./mcp/protocol.js";

// 🆕 CONSOLIDATED CONFIGURATION TYPES (Primary exports)
export {
  // Environment
  type Environment,
  EnvironmentSchema,
  // Core Configuration Types (these replace the ones from gateway/types.js)
  type McpServerConfig,
  type McpServerRuntimeConfig,
  type McpServersRuntimeConfig,
  type McpGatewayConfig,
  type McpServerDefinition,
  // Validation Schemas
  McpServerConfigSchema,
  McpServerRuntimeConfigSchema,
  McpGatewayConfigSchema,
  McpServerDefinitionSchema,
  // Helper Functions
  createMcpServerConfig,
  createRuntimeConfig,
  validateServerConfig,
  // Type Guards
  isMcpServerConfig,
  isRuntimeServerConfig,
} from "./mcp/configuration.js";

// Organization types
export type {
  OrganizationContext,
  OrganizationWithServices,
} from "./organization/context.js";
