import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createMcpLogger } from "@mcp/utils";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";

const logger = createMcpLogger("mcp-gateway-security");

export interface SecurityConfig {
  enableRateLimit: boolean;
  rateLimitPerMinute: number;
  requireApiKey: boolean;
  apiKey: string;
  maxRequestSizeMb: number;
  allowedOrigins: string[];
  corsCredentials: boolean;
  securityHeaders: boolean;
}

export interface AuthenticatedRequest extends FastifyRequest {
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

  // 3. Rate Limiting
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
      errorResponseBuilder: (request: FastifyRequest, context: any) => {
        logger.warn("Rate limit exceeded", {
          ip: request.ip,
          userAgent: request.headers["user-agent"],
          timeWindow: context.timeWindow,
          max: context.max,
        });

        return {
          error: "Rate limit exceeded",
          message: `Too many requests. Limit: ${context.max} requests per ${context.timeWindow}`,
          retryAfter: Math.round(context.ttl / 1000),
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

  // 6. Input Validation Middleware
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
      const responseTime = reply.getResponseTime();

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
    const apiKeyQuery = (request.query as any)?.api_key;
    if (apiKeyQuery && typeof apiKeyQuery === "string") {
      return apiKeyQuery;
    }
  }

  return null;
}

/**
 * Validate API key against configured key(s)
 */
function isValidApiKey(providedKey: string, configuredKey: string): boolean {
  // In production, you might want to support multiple keys or use hashing
  return providedKey === configuredKey;
}

/**
 * Mask API key for logging (show first 4 and last 4 characters)
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "*".repeat(apiKey.length);
  }
  return `${apiKey.slice(0, 4)}${"*".repeat(apiKey.length - 8)}${apiKey.slice(
    -4
  )}`;
}

/**
 * Validate MCP JSON-RPC request structure
 */
function validateMCPRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    errors.push("Request body must be a JSON object");
    return { valid: false, errors };
  }

  // JSON-RPC 2.0 validation
  if (body.jsonrpc !== "2.0") {
    errors.push("Invalid or missing jsonrpc version (must be '2.0')");
  }

  if (!body.method || typeof body.method !== "string") {
    errors.push("Missing or invalid method field");
  }

  if (
    body.id !== undefined &&
    typeof body.id !== "string" &&
    typeof body.id !== "number"
  ) {
    errors.push("Invalid id field (must be string or number)");
  }

  // MCP-specific validation
  if (body.method === "tools/call") {
    if (!body.params || typeof body.params !== "object") {
      errors.push("tools/call requires params object");
    } else {
      if (!body.params.name || typeof body.params.name !== "string") {
        errors.push("tools/call requires params.name string");
      }
      if (body.params.arguments && typeof body.params.arguments !== "object") {
        errors.push("tools/call params.arguments must be object if provided");
      }
    }
  }

  // Request size validation (already handled by bodyLimit, but double-check)
  const bodyString = JSON.stringify(body);
  if (bodyString.length > 1024 * 1024) {
    // 1MB max for individual requests
    errors.push("Request body too large");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a secure API key for production use
 */
export function generateSecureApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "mcp_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
