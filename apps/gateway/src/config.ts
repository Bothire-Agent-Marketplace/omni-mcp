import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import {
  buildMCPServersConfig,
  type MCPServersRuntimeConfig,
} from "@mcp/utils/mcp-servers.js";
import {
  validatePort,
  validateSecret,
  parseOrigins,
  type Environment,
} from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

// Define the shape of the Gateway's specific configuration
interface GatewayConfig {
  env: Environment;
  port: number;
  host: string;
  allowedOrigins: string[];
  jwtSecret: string;
  mcpApiKey: string;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  rateLimitPerMinute: number;
  requireApiKey: boolean;
  enableRateLimit: boolean;
  maxRequestSizeMb: number;
  corsCredentials: boolean;
  securityHeaders: boolean;
  mcpServers: MCPServersRuntimeConfig;
}

function createGatewayConfig(): GatewayConfig {
  const env = detectEnvironment();
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
    mcpServers: buildMCPServersConfig(env),
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
