import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DEVTOOLS_SERVER } from "@mcp/capabilities";
import type { Environment } from "@mcp/schemas";
import type { McpServerConfig } from "@mcp/server-core";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..", "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface DevtoolsServerConfig extends McpServerConfig {
  env: Environment;
  port: number;
  host: string;
  devtoolsApiKey?: string;
  logLevel: string;
  // Browser configuration
  browserType?: string;
  browserPath?: string;
  chromePort?: number;
}

function createDevtoolsServerConfig(): DevtoolsServerConfig {
  const env = detectEnvironment();
  const isProduction = env === "production";

  const config: DevtoolsServerConfig = {
    env,
    port: validatePort(process.env.DEVTOOLS_SERVER_PORT, DEVTOOLS_SERVER.port),
    host: process.env.HOST || "0.0.0.0",
    devtoolsApiKey: process.env.DEVTOOLS_API_KEY,
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    // Browser configuration from environment
    browserType: process.env.DEVTOOLS_BROWSER,
    browserPath: process.env.DEVTOOLS_BROWSER_PATH,
    chromePort: process.env.DEVTOOLS_PORT
      ? parseInt(process.env.DEVTOOLS_PORT)
      : 9222,
  };

  return config;
}

export const devtoolsServerConfig = createDevtoolsServerConfig();
