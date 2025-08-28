export * from "./env-loader.js";
export * from "./validation.js";
export * from "./mcp-server-utilities.js";
export * from "./logger.js";

export type McpErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class McpError extends Error {
  public readonly code: McpErrorCode;
  public readonly details?: unknown;
  constructor(message: string, code: McpErrorCode, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "McpError";
  }
}

export const Errors = {
  badRequest(message = "Bad request", details?: unknown): McpError {
    return new McpError(message, "BAD_REQUEST", details);
  },
  unauthorized(message = "Unauthorized", details?: unknown): McpError {
    return new McpError(message, "UNAUTHORIZED", details);
  },
  rateLimited(message = "Rate limit exceeded", details?: unknown): McpError {
    return new McpError(message, "RATE_LIMITED", details);
  },
  internal(message = "Internal server error", details?: unknown): McpError {
    return new McpError(message, "INTERNAL_ERROR", details);
  },
};
