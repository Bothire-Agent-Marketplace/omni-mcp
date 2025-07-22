import { z } from "zod";

/**
 * Standardized API Response Types
 * Used across all HTTP endpoints for consistent response structures
 */

// ============================================================================
// SUCCESS RESPONSE TYPES
// ============================================================================

/**
 * Standard success response structure
 */
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  message: z.string().optional(),
  timestamp: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  executionTime: z.number().optional(), // Added for MCP protocol compatibility
});

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
  timestamp?: string;
  meta?: Record<string, unknown>;
  executionTime?: number; // Added for MCP protocol compatibility
};

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

/**
 * Standard error response structure
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().optional(),
  code: z.string().optional(),
});

export type ApiErrorResponse = {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
  timestamp?: string;
  code?: string;
};

// ============================================================================
// COMBINED RESPONSE TYPE
// ============================================================================

/**
 * Combined API response type for all endpoints
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ApiResponseSchema = z.union([
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema,
]);

// ============================================================================
// HEALTH CHECK RESPONSES
// ============================================================================

export const ApiHealthStatusSchema = z.object({
  status: z.enum(["ok", "error", "degraded"]),
  timestamp: z.string(),
  services: z
    .record(
      z.string(),
      z.object({
        status: z.enum(["healthy", "unhealthy", "unknown"]),
        connected: z.boolean().optional(),
        lastCheck: z.string().optional(),
        details: z.string().optional(),
      })
    )
    .optional(),
  environment: z.string().optional(),
  version: z.string().optional(),
});

export type ApiHealthStatus = z.infer<typeof ApiHealthStatusSchema>;

// ============================================================================
// PAGINATION RESPONSES
// ============================================================================

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export type PaginatedResponse<T> = ApiSuccessResponse<T[]> & {
  meta: {
    pagination: PaginationMeta;
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  meta?: Record<string, unknown>
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  if (meta) response.meta = meta;

  return response;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  message?: string,
  details?: unknown,
  code?: string
): ApiErrorResponse {
  return {
    success: false,
    error,
    message,
    details,
    code,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    meta: { pagination },
  };
}

/**
 * Create a health status response
 */
export function createHealthResponse(
  status: "ok" | "error" | "degraded",
  services?: Record<
    string,
    {
      status: "healthy" | "unhealthy" | "unknown";
      connected?: boolean;
      lastCheck?: string;
      details?: string;
    }
  >,
  environment?: string,
  version?: string
): ApiHealthStatus {
  return {
    status,
    timestamp: new Date().toISOString(),
    services,
    environment,
    version,
  };
}
