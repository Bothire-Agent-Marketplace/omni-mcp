/**
 * API Response Types and Utilities
 * Standardized response patterns for all HTTP endpoints
 */

export * from "./responses.js";

// ============================================================================
// UNIFIED RESPONSE ALIASES - CLEAN NAMING
// ============================================================================

export type {
  ApiSuccessResponse as McpSuccessResponse,
  ApiErrorResponse as McpErrorResponse,
  ApiResponse as McpResponse,
} from "./responses.js";

export {
  ApiSuccessResponseSchema as McpSuccessResponseSchema,
  ApiErrorResponseSchema as McpErrorResponseSchema,
  ApiResponseSchema as McpResponseSchema,
} from "./responses.js";
