import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildMCPServersConfig } from "packages/utils/src/mcp-server-configs.js";
import { McpGatewayConfig } from "@mcp/schemas";
import {
  detectEnvironment,
  loadEnvironment,
  type Environment,
} from "@mcp/utils/env-loader.js";
import {
  validatePort,
  validateSecret,
  parseOrigins,
} from "@mcp/utils/validation.js";
import { ALL_MCP_SERVERS } from "./config/server-registry.js";

// Well-known development API key for easy local testing
const DEV_API_KEY = "dev-api-key-12345";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

// Gateway configuration removed - now using shared type from @mcp/schemas

async function createGatewayConfig(): Promise<McpGatewayConfig> {
  const env: Environment = detectEnvironment();
  const isProduction = env === "production";

  const config: McpGatewayConfig = {
    env,
    port: validatePort(process.env.GATEWAY_PORT, 37373),
    host: process.env.GATEWAY_HOST || "0.0.0.0",
    logLevel: process.env.LOG_LEVEL || "info",
    allowedOrigins: parseOrigins(
      process.env.ALLOWED_ORIGINS ||
        (isProduction ? "" : "http://localhost:8080")
    ),
    jwtSecret: validateSecret(process.env.JWT_SECRET, env, "JWT_SECRET"),
    mcpApiKey: process.env.MCP_API_KEY || (isProduction ? "" : DEV_API_KEY),
    sessionTimeout: parseInt(
      process.env.SESSION_TIMEOUT || (isProduction ? "3600000" : "900000")
    ), // 1 hour prod, 15 min dev
    maxConcurrentSessions: parseInt(
      process.env.MAX_CONCURRENT_SESSIONS || (isProduction ? "500" : "500")
    ),
    rateLimitPerMinute: parseInt(
      process.env.API_RATE_LIMIT || (isProduction ? "100" : "1000")
    ),
    requireApiKey: true, // Always require API key for security
    enableRateLimit: isProduction,
    maxRequestSizeMb: parseInt(process.env.MAX_REQUEST_SIZE || "1"),
    corsCredentials: process.env.CORS_CREDENTIALS !== "false",
    securityHeaders: isProduction,
    mcpServers: await buildMCPServersConfig(ALL_MCP_SERVERS, env),
  };

  // Final validation for production
  if (isProduction) {
    if (config.allowedOrigins.length === 0) {
      throw new Error("ALLOWED_ORIGINS must be set in production.");
    }
    if (!config.mcpApiKey || config.mcpApiKey === DEV_API_KEY) {
      throw new Error(
        "MCP_API_KEY must be set in production and cannot be the development key."
      );
    }
  }

  return config;
}

export async function getGatewayConfig(): Promise<McpGatewayConfig> {
  return await createGatewayConfig();
}
