import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { GatewayConfig } from "@mcp/schemas";
import {
  detectEnvironment,
  loadEnvironment,
  type Environment,
} from "@mcp/utils/env-loader.js";
import { buildMCPServersConfig } from "@mcp/utils/mcp-servers.js";
import {
  validatePort,
  validateSecret,
  parseOrigins,
} from "@mcp/utils/validation.js";
import { ALL_MCP_SERVERS } from "./config/server-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

// Gateway configuration removed - now using shared type from @mcp/schemas

function createGatewayConfig(): GatewayConfig {
  const env: Environment = detectEnvironment();
  const isProduction = env === "production";

  const config: GatewayConfig = {
    env,
    port: validatePort(process.env.GATEWAY_PORT, 37373),
    host: process.env.GATEWAY_HOST || "0.0.0.0",
    allowedOrigins: parseOrigins(
      process.env.ALLOWED_ORIGINS ||
        (isProduction ? "" : "http://localhost:3000,http://localhost:8080")
    ),
    jwtSecret: validateSecret(process.env.JWT_SECRET, env, "JWT_SECRET"),
    mcpApiKey: validateSecret(process.env.MCP_API_KEY, env, "MCP_API_KEY"),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "3600000"), // 1 hour
    maxConcurrentSessions: parseInt(
      process.env.MAX_CONCURRENT_SESSIONS || (isProduction ? "500" : "100")
    ),
    rateLimitPerMinute: parseInt(
      process.env.API_RATE_LIMIT || (isProduction ? "100" : "1000")
    ),
    requireApiKey: isProduction,
    enableRateLimit: isProduction,
    maxRequestSizeMb: parseInt(process.env.MAX_REQUEST_SIZE || "1"),
    corsCredentials: process.env.CORS_CREDENTIALS !== "false",
    securityHeaders: isProduction,
    mcpServers: buildMCPServersConfig(
      ALL_MCP_SERVERS,
      env
    ) as import("@mcp/schemas").MCPServersRuntimeConfig,
  };

  // Final validation for production
  if (isProduction) {
    if (config.allowedOrigins.length === 0) {
      throw new Error("ALLOWED_ORIGINS must be set in production.");
    }
  }

  return config;
}

export const gatewayConfig = createGatewayConfig();
