import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PERPLEXITY_SERVER } from "@mcp/capabilities";
import type { BaseMcpServerConfig } from "@mcp/server-core";
// Environment removed - not used in this file
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort, validateSecret } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..", "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface PerplexityServerConfig extends BaseMcpServerConfig {
  perplexityApiKey: string;
  baseUrl: string;
  maxRetries: number;
  timeout: number;
  defaultModel: string;
}

function createPerplexityServerConfig(): PerplexityServerConfig {
  const env = detectEnvironment();
  const isProduction = env === "production";

  const config: PerplexityServerConfig = {
    env,
    port: validatePort(
      process.env.PERPLEXITY_SERVER_PORT,
      PERPLEXITY_SERVER.port
    ),
    host: process.env.HOST || "0.0.0.0",
    perplexityApiKey: validateSecret(
      process.env.PERPLEXITY_API_KEY,
      env,
      "PERPLEXITY_API_KEY"
    ),
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    baseUrl: "https://api.perplexity.ai",
    maxRetries: 3,
    timeout: 30000,
    defaultModel: "sonar-pro",
  };

  if (!config.perplexityApiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is required");
  }

  return config;
}

export const perplexityServerConfig = createPerplexityServerConfig();
