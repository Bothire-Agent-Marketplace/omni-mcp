import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DEVTOOLS_SERVER } from "@mcp/capabilities";
import type { BaseMcpServerConfig } from "@mcp/server-core";
import type { Environment } from "@mcp/utils";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface DevtoolsServerConfig extends BaseMcpServerConfig {
  env: Environment;
  port: number;
  host: string;
  devtoolsApiKey?: string;
  logLevel: string;
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
  };

  return config;
}

export const devtoolsServerConfig = createDevtoolsServerConfig();
