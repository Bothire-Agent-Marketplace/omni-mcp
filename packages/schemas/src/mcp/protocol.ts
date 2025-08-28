import { z } from "zod";

export interface MCPJsonRpcRequest {
  jsonrpc: "2.0";

  method: string;

  params?: Record<string, unknown>;

  id?: string | number;
}

export interface MCPJsonRpcSuccessResponse<T = unknown> {
  jsonrpc: "2.0";

  result: T;

  id: string | number | undefined;
}

export interface MCPJsonRpcError {
  code: number;

  message: string;

  data?: unknown;
}

export interface MCPJsonRpcErrorResponse {
  jsonrpc: "2.0";

  error: MCPJsonRpcError;

  id: string | number | undefined;
}

export type MCPJsonRpcResponse<T = unknown> =
  | MCPJsonRpcSuccessResponse<T>
  | MCPJsonRpcErrorResponse;

export const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,

  INVALID_REQUEST: -32600,

  METHOD_NOT_FOUND: -32601,

  INVALID_PARAMS: -32602,

  INTERNAL_ERROR: -32603,

  SERVER_ERROR_MIN: -32099,
  SERVER_ERROR_MAX: -32000,
} as const;

export const MCPJsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

export const MCPJsonRpcErrorSchema = z.object({
  code: z.number().int(),
  message: z.string().min(1),
  data: z.unknown().optional(),
});

export const MCPJsonRpcSuccessResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  result: z.unknown(),
  id: z.union([z.string(), z.number(), z.null()]),
});

export const MCPJsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  error: MCPJsonRpcErrorSchema,
  id: z.union([z.string(), z.number(), z.null()]),
});

export const MCPJsonRpcResponseSchema = z.union([
  MCPJsonRpcSuccessResponseSchema,
  MCPJsonRpcErrorResponseSchema,
]);

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

export function isJsonRpcSuccessResponse<T = unknown>(
  response: MCPJsonRpcResponse<T>
): response is MCPJsonRpcSuccessResponse<T> {
  return "result" in response;
}

export function isJsonRpcErrorResponse(
  response: MCPJsonRpcResponse
): response is MCPJsonRpcErrorResponse {
  return "error" in response;
}

export function isValidJsonRpcRequest(obj: unknown): obj is MCPJsonRpcRequest {
  const result = MCPJsonRpcRequestSchema.safeParse(obj);
  return result.success;
}
