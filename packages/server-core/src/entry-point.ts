#!/usr/bin/env node

import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import type { McpServerConfig } from "./config.js";

export interface EntryPointOptions<TConfig extends McpServerConfig> {
  serverName: string;

  config: TConfig;

  startServer: (config: TConfig) => Promise<void>;
}

export function createServerEntryPoint<TConfig extends McpServerConfig>(
  options: EntryPointOptions<TConfig>
): { logger: ReturnType<typeof createMcpLogger>; main: () => Promise<void> } {
  const { serverName, config, startServer } = options;

  const logger = createMcpLogger({
    serverName,
    logLevel: config.logLevel,
    environment: config.env,
  });

  setupGlobalErrorHandlers(logger);

  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    process.exit(0);
  });

  async function main(): Promise<void> {
    try {
      logger.info(`Starting ${serverName} MCP server on port ${config.port}`);
      await startServer(config);
    } catch (error) {
      logger.error("Unhandled error during startup", error as Error);
      process.exit(1);
    }
  }

  return { logger, main };
}

export async function runMcpServer<TConfig extends McpServerConfig>(
  options: EntryPointOptions<TConfig>
): Promise<void> {
  const { main } = createServerEntryPoint(options);
  await main();
}
