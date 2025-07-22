import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { HTTPRequestBody } from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";

// Query parameters interface for type safety
interface MCPQueryParams {
  api_key?: string;
}

// Security configuration interface
interface SecurityConfig {
  logger: McpLogger;
  enableRateLimit: boolean;
  rateLimitPerMinute: number;
  requireApiKey: boolean;
  apiKey: string;
  maxRequestSizeMb: number;
  allowedOrigins: string[];
  corsCredentials: boolean;
  securityHeaders: boolean;
}

interface AuthenticatedRequest extends FastifyRequest {
  isAuthenticated?: boolean;
  apiKeyUsed?: string;
}

/**
 * Registers comprehensive security middleware for the Fastify gateway
 */
export async function registerSecurityMiddleware(
  fastify: FastifyInstance,
  config: SecurityConfig
): Promise<void> {
  const logger = config.logger.fork("middleware");

  logger.info("Registering security middleware", {
    enableRateLimit: config.enableRateLimit,
    requireApiKey: config.requireApiKey,
    securityHeaders: config.securityHeaders,
    maxRequestSizeMb: config.maxRequestSizeMb,
  });

  // 1. Security Headers (Helmet)
  if (config.securityHeaders) {
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", ...config.allowedOrigins],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // For WebSocket support
    });
    logger.info("Security headers enabled");
  }

  // 2. Sensible defaults
  await fastify.register(sensible);

  // 3. Rate Limiting with proper TypeScript types
  if (config.enableRateLimit) {
    await fastify.register(rateLimit, {
      max: config.rateLimitPerMinute,
      timeWindow: "1 minute",
      hook: "preHandler",
      keyGenerator: (request: FastifyRequest) => {
        // Use API key if available, otherwise IP
        const apiKey = extractApiKey(request);
        return apiKey || request.ip;
      },
      errorResponseBuilder: (request: FastifyRequest, context: unknown) => {
        const ctx = context as {
          timeWindow?: unknown;
          max?: unknown;
          ttl?: unknown;
        };
        logger.warn("Rate limit exceeded", {
          ip: request.ip,
          userAgent: request.headers["user-agent"],
          timeWindow: ctx.timeWindow,
          max: ctx.max,
        });

        return {
          error: "Rate limit exceeded",
          message: `Too many requests. Limit: ${ctx.max} requests per ${ctx.timeWindow}`,
          retryAfter: Math.round((ctx.ttl as number) / 1000),
        };
      },
      onExceeding: (request: FastifyRequest) => {
        logger.warn("Approaching rate limit", {
          ip: request.ip,
          endpoint: request.url,
        });
      },
    });
    logger.info(`Rate limiting enabled: ${config.rateLimitPerMinute} req/min`);
  }

  // 4. Request Size Limiting
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string", bodyLimit: config.maxRequestSizeMb * 1024 * 1024 },
    function (request, body, done) {
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        logger.error("JSON parsing error", err as Error, {
          bodyLength: (body as string).length,
          contentType: request.headers["content-type"],
        });
        done(new Error("Invalid JSON"), undefined);
      }
    }
  );

  // 5. API Key Authentication Middleware
  if (config.requireApiKey) {
    fastify.addHook(
      "preHandler",
      async (request: AuthenticatedRequest, reply: FastifyReply) => {
        // Skip authentication for health check
        if (request.url === "/health") {
          return;
        }

        const apiKey = extractApiKey(request);

        if (!apiKey) {
          logger.warn("Missing API key", {
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            endpoint: request.url,
          });

          return reply.code(401).send({
            error: "Unauthorized",
            message:
              "API key required. Provide via Authorization header or x-api-key",
          });
        }

        if (!isValidApiKey(apiKey, config.apiKey)) {
          logger.warn("Invalid API key", {
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            endpoint: request.url,
            providedKey: maskApiKey(apiKey),
          });

          return reply.code(401).send({
            error: "Unauthorized",
            message: "Invalid API key",
          });
        }

        // Mark request as authenticated
        request.isAuthenticated = true;
        request.apiKeyUsed = maskApiKey(apiKey);

        logger.debug("API key validated", {
          endpoint: request.url,
          apiKey: request.apiKeyUsed,
        });
      }
    );

    logger.info("API key authentication enabled");
  }

  // 6. Input Validation Middleware with proper typing
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Validate MCP requests
      if (request.url === "/mcp" && request.method === "POST") {
        const validation = validateMCPRequest(request.body);
        if (!validation.valid) {
          logger.warn("Invalid MCP request", {
            errors: validation.errors,
            body:
              typeof request.body === "object"
                ? JSON.stringify(request.body).slice(0, 200)
                : request.body,
          });

          return reply.code(400).send({
            error: "Invalid request",
            message: "MCP request validation failed",
            details: validation.errors,
          });
        }
      }
    }
  );

  // 7. Security Logging Middleware
  fastify.addHook(
    "onResponse",
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const responseTime = reply.elapsedTime;

      logger.info("Request completed", {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(responseTime),
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        authenticated: request.isAuthenticated || false,
        apiKey: request.apiKeyUsed,
      });
    }
  );

  logger.info("Security middleware registration complete");
}

/**
 * Extract API key from request headers
 */
function extractApiKey(request: FastifyRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check x-api-key header
  const apiKeyHeader = request.headers["x-api-key"];
  if (apiKeyHeader && typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }

  // Check query parameter (less secure, for dev only)
  if (process.env.NODE_ENV === "development") {
    const apiKeyQuery = (request.query as MCPQueryParams)?.api_key;
    if (apiKeyQuery && typeof apiKeyQuery === "string") {
      return apiKeyQuery;
    }
  }

  return null;
}

/**
 * Validate API key against configured value
 */
function isValidApiKey(providedKey: string, configuredKey: string): boolean {
  // Use timing-safe comparison to prevent timing attacks
  if (providedKey.length !== configuredKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedKey.length; i++) {
    result |= providedKey.charCodeAt(i) ^ configuredKey.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Mask API key for logging (show first 8 chars, rest as *)
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "*".repeat(apiKey.length);
  return apiKey.slice(0, 8) + "*".repeat(apiKey.length - 8);
}

/**
 * Validate MCP request structure with proper typing
 */
function validateMCPRequest(body: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Type guard to ensure body is an object
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: ["Request body must be a valid JSON object"],
    };
  }

  const mcpBody = body as HTTPRequestBody;

  if (mcpBody.jsonrpc !== "2.0") {
    errors.push("jsonrpc field must be '2.0'");
  }

  if (!mcpBody.method || typeof mcpBody.method !== "string") {
    errors.push("method field is required and must be a string");
  }

  if (
    mcpBody.id !== undefined &&
    typeof mcpBody.id !== "string" &&
    typeof mcpBody.id !== "number"
  ) {
    errors.push("id field must be a string or number if provided");
  }

  // Additional validation for specific methods
  if (mcpBody.method === "tools/call") {
    if (!mcpBody.params || typeof mcpBody.params !== "object") {
      errors.push("params field is required for tools/call");
    } else {
      if (!mcpBody.params.name || typeof mcpBody.params.name !== "string") {
        errors.push("params.name is required for tools/call");
      }
      if (
        mcpBody.params.arguments &&
        typeof mcpBody.params.arguments !== "object"
      ) {
        errors.push("params.arguments must be an object if provided");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
