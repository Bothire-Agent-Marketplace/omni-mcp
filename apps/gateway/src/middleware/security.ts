import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { HTTPRequestBody } from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";

interface MCPQueryParams {
  api_key?: string;
}

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
      crossOriginEmbedderPolicy: false,
    });
    logger.info("Security headers enabled");
  }

  await fastify.register(sensible);

  if (config.enableRateLimit) {
    await fastify.register(rateLimit, {
      max: config.rateLimitPerMinute,
      timeWindow: "1 minute",
      hook: "preHandler",
      keyGenerator: (request: FastifyRequest) => {
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

  if (config.requireApiKey) {
    fastify.addHook(
      "preHandler",
      async (request: AuthenticatedRequest, reply: FastifyReply) => {
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

  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
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

function extractApiKey(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const apiKeyHeader = request.headers["x-api-key"];
  if (apiKeyHeader && typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }

  if (process.env.NODE_ENV === "development") {
    const apiKeyQuery = (request.query as MCPQueryParams)?.api_key;
    if (apiKeyQuery && typeof apiKeyQuery === "string") {
      return apiKeyQuery;
    }
  }

  return null;
}

function isValidApiKey(providedKey: string, configuredKey: string): boolean {
  if (providedKey.length !== configuredKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedKey.length; i++) {
    result |= providedKey.charCodeAt(i) ^ configuredKey.charCodeAt(i);
  }

  return result === 0;
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "*".repeat(apiKey.length);
  return apiKey.slice(0, 8) + "*".repeat(apiKey.length - 8);
}

function validateMCPRequest(body: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

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
