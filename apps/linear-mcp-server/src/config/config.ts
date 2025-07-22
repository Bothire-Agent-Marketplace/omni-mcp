import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { LINEAR_SERVER } from "@mcp/capabilities";
import type { Environment } from "@mcp/schemas";
import type { BaseMcpServerConfig } from "@mcp/server-core";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort, validateSecret } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface LinearServerConfig extends BaseMcpServerConfig {
  env: Environment;
  port: number;
  host: string;
  linearApiKey: string;
  logLevel: string;
}

function createLinearServerConfig(): LinearServerConfig {
  const env = detectEnvironment();
  const isProduction = env === "production";

  const config: LinearServerConfig = {
    env,
    port: validatePort(process.env.LINEAR_SERVER_PORT, LINEAR_SERVER.port),
    host: process.env.HOST || "0.0.0.0",
    linearApiKey: validateSecret(
      process.env.LINEAR_API_KEY,
      env,
      "LINEAR_API_KEY"
    ),
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  };

  if (env !== "test" && !config.linearApiKey) {
    throw new Error("LINEAR_API_KEY is required for linear-mcp-server.");
  }

  return config;
}

export const linearServerConfig = createLinearServerConfig();
