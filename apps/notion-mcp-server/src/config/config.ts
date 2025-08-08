import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { NOTION_SERVER } from "@mcp/capabilities";
import type { Environment } from "@mcp/schemas";
import type { McpServerConfig } from "@mcp/server-core";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort, validateSecret } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface NotionServerConfig extends McpServerConfig {
  env: Environment;
  port: number;
  host: string;
  notionApiKey: string;
  logLevel: string;
}

function createNotionServerConfig(): NotionServerConfig {
  const env = detectEnvironment();
  const isProduction = env === "production";

  const config: NotionServerConfig = {
    env,
    port: validatePort(process.env.NOTION_SERVER_PORT, NOTION_SERVER.port),
    host: process.env.HOST || "0.0.0.0",
    notionApiKey: validateSecret(
      process.env.NOTION_API_KEY,
      env,
      "NOTION_API_KEY"
    ),
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  };

  if (env !== "test" && !config.notionApiKey) {
    throw new Error("NOTION_API_KEY is required for notion-mcp-server.");
  }

  return config;
}

export const notionServerConfig = createNotionServerConfig();
