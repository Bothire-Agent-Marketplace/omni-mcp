import { z } from "zod";

// ============================================================================
// MCP JSON-RPC PROTOCOL TYPES - Single Source of Truth
// ============================================================================
//
// This file consolidates all MCP JSON-RPC protocol types used across the
// entire codebase. All servers, gateways, and clients should import from here.
//
// JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
// ============================================================================

/**
 * JSON-RPC 2.0 Request
 * Used by all MCP clients to make requests to servers
 */
export interface MCPJsonRpcRequest {
  /** MUST be exactly "2.0" */
  jsonrpc: "2.0";
  /** Method name to call */
  method: string;
  /** Optional parameters object */
  params?: Record<string, unknown>;
  /** Optional ID for correlation - omit for notifications */
  id?: string | number;
}

/**
 * JSON-RPC 2.0 Success Response
 * Returned when a request succeeds
 */
export interface MCPJsonRpcSuccessResponse<T = unknown> {
  /** MUST be exactly "2.0" */
  jsonrpc: "2.0";
  /** Result of the successful operation */
  result: T;
  /** ID that matches the request (undefined for notifications) */
  id: string | number | undefined;
}

/**
 * JSON-RPC 2.0 Error Object
 * Standard error structure within error responses
 */
export interface MCPJsonRpcError {
  /** Error code (integer) */
  code: number;
  /** Human-readable error message */
  message: string;
  /** Optional additional error data */
  data?: unknown;
}

/**
 * JSON-RPC 2.0 Error Response
 * Returned when a request fails
 */
export interface MCPJsonRpcErrorResponse {
  /** MUST be exactly "2.0" */
  jsonrpc: "2.0";
  /** Error details */
  error: MCPJsonRpcError;
  /** ID that matches the request (undefined if request ID couldn't be determined) */
  id: string | number | undefined;
}

/**
 * Union type for any JSON-RPC response
 */
export type MCPJsonRpcResponse<T = unknown> =
  | MCPJsonRpcSuccessResponse<T>
  | MCPJsonRpcErrorResponse;

// ============================================================================
// STANDARD JSON-RPC ERROR CODES
// ============================================================================

/**
 * Standard JSON-RPC 2.0 error codes
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const JSON_RPC_ERROR_CODES = {
  /** Invalid JSON was received by the server */
  PARSE_ERROR: -32700,
  /** The JSON sent is not a valid Request object */
  INVALID_REQUEST: -32600,
  /** The method does not exist / is not available */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameter(s) */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error */
  INTERNAL_ERROR: -32603,
  /** Reserved for implementation-defined server-errors (-32099 to -32000) */
  SERVER_ERROR_MIN: -32099,
  SERVER_ERROR_MAX: -32000,
} as const;

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for validating JSON-RPC requests
 */
export const MCPJsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

/**
 * Zod schema for validating JSON-RPC error objects
 */
export const MCPJsonRpcErrorSchema = z.object({
  code: z.number().int(),
  message: z.string().min(1),
  data: z.unknown().optional(),
});

/**
 * Zod schema for validating JSON-RPC success responses
 */
export const MCPJsonRpcSuccessResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  result: z.unknown(),
  id: z.union([z.string(), z.number(), z.null()]),
});

/**
 * Zod schema for validating JSON-RPC error responses
 */
export const MCPJsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  error: MCPJsonRpcErrorSchema,
  id: z.union([z.string(), z.number(), z.null()]),
});

/**
 * Zod schema for validating any JSON-RPC response
 */
export const MCPJsonRpcResponseSchema = z.union([
  MCPJsonRpcSuccessResponseSchema,
  MCPJsonRpcErrorResponseSchema,
]);

// ============================================================================
// HELPER FUNCTIONS FOR ERROR RESPONSES
// ============================================================================

/**
 * Create a standardized JSON-RPC error response
 */
export function createJsonRpcErrorResponse(
  error: MCPJsonRpcError,
  id: string | number | undefined = undefined
): MCPJsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    error,
    id,
  };
}

/**
 * Create a standardized JSON-RPC success response
 */
export function createJsonRpcSuccessResponse<T>(
  result: T,
  id: string | number | undefined
): MCPJsonRpcSuccessResponse<T> {
  return {
    jsonrpc: "2.0",
    result,
    id,
  };
}

/**
 * Create a parse error response (invalid JSON)
 */
export function createParseErrorResponse(
  id: string | number | undefined = undefined
): MCPJsonRpcErrorResponse {
  return createJsonRpcErrorResponse(
    {
      code: JSON_RPC_ERROR_CODES.PARSE_ERROR,
      message: "Parse error",
    },
    id
  );
}

/**
 * Create an invalid request error response
 */
export function createInvalidRequestErrorResponse(
  id: string | number | undefined = undefined
): MCPJsonRpcErrorResponse {
  return createJsonRpcErrorResponse(
    {
      code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      message: "Invalid Request",
    },
    id
  );
}

/**
 * Create a method not found error response
 */
export function createMethodNotFoundErrorResponse(
  method: string,
  id: string | number | undefined = undefined
): MCPJsonRpcErrorResponse {
  return createJsonRpcErrorResponse(
    {
      code: JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND,
      message: `Method not found: ${method}`,
    },
    id
  );
}

/**
 * Create an invalid params error response (with Zod validation details)
 */
export function createInvalidParamsErrorResponse(
  validationDetails?: string,
  id: string | number | undefined = undefined
): MCPJsonRpcErrorResponse {
  return createJsonRpcErrorResponse(
    {
      code: JSON_RPC_ERROR_CODES.INVALID_PARAMS,
      message: "Invalid params",
      data: validationDetails
        ? `Validation failed: ${validationDetails}`
        : undefined,
    },
    id
  );
}

/**
 * Create an internal error response
 */
export function createInternalErrorResponse(
  errorMessage?: string,
  id: string | number | undefined = undefined
): MCPJsonRpcErrorResponse {
  return createJsonRpcErrorResponse(
    {
      code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      message: "Internal server error",
      data: errorMessage,
    },
    id
  );
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if response is a success response
 */
export function isJsonRpcSuccessResponse<T = unknown>(
  response: MCPJsonRpcResponse<T>
): response is MCPJsonRpcSuccessResponse<T> {
  return "result" in response;
}

/**
 * Type guard to check if response is an error response
 */
export function isJsonRpcErrorResponse(
  response: MCPJsonRpcResponse
): response is MCPJsonRpcErrorResponse {
  return "error" in response;
}

/**
 * Type guard to validate JSON-RPC request structure
 */
export function isValidJsonRpcRequest(obj: unknown): obj is MCPJsonRpcRequest {
  const result = MCPJsonRpcRequestSchema.safeParse(obj);
  return result.success;
}

// ============================================================================
// LEGACY TYPE ALIASES (For Backward Compatibility)
// ============================================================================

// Legacy aliases removed - use MCPJsonRpc* types directly
