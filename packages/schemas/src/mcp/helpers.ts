import {
  MCPJsonRpcRequest,
  MCPJsonRpcRequestSchema,
  MCPJsonRpcErrorResponse,
  createInvalidRequestErrorResponse,
  createInvalidParamsErrorResponse,
} from "./protocol.js";

export function validateJsonRpcRequest(body: unknown): {
  valid: boolean;
  errors: string[];
} {
  const parsed = MCPJsonRpcRequestSchema.safeParse(body);
  if (parsed.success) {
    return { valid: true, errors: [] };
  }
  const errors: string[] = parsed.error.issues.map((i) => i.message);
  return { valid: false, errors };
}

export function parseJsonRpcRequest(body: unknown): {
  request?: MCPJsonRpcRequest;
  errors?: string[];
} {
  const parsed = MCPJsonRpcRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }
  return { request: parsed.data as MCPJsonRpcRequest };
}

export function buildInvalidRequestError(
  id?: string | number
): MCPJsonRpcErrorResponse {
  return createInvalidRequestErrorResponse(id);
}

export function buildInvalidParamsError(
  details?: string,
  id?: string | number
): MCPJsonRpcErrorResponse {
  return createInvalidParamsErrorResponse(details, id);
}
