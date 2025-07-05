#!/usr/bin/env node

import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import type { BaseMcpServerConfig } from "./config.js";

// ============================================================================
// GENERIC MCP SERVER ENTRY POINT
// ============================================================================

/**
 * Options for creating a server entry point
 */
export interface EntryPointOptions<TConfig extends BaseMcpServerConfig> {
  /** Server name for logging */
  serverName: string;
  /** Server configuration */
  config: TConfig;
  /** Function to start the server */
  startServer: (config: TConfig) => Promise<void>;
}

/**
 * Creates a standardized entry point for MCP servers
 */
export function createServerEntryPoint<TConfig extends BaseMcpServerConfig>(
  options: EntryPointOptions<TConfig>
): { logger: ReturnType<typeof createMcpLogger>; main: () => Promise<void> } {
  const { serverName, config, startServer } = options;

  // Initialize MCP-compliant logger
  const logger = createMcpLogger({
    serverName,
    logLevel: config.logLevel,
    environment: config.env,
  });

  // Setup global error handlers
  setupGlobalErrorHandlers(logger);

  // Graceful shutdown handlers
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    process.exit(0);
  });

  // Main server startup function
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

/**
 * Simplified entry point that automatically starts the server
 */
export async function runMcpServer<TConfig extends BaseMcpServerConfig>(
  options: EntryPointOptions<TConfig>
): Promise<void> {
  const { main } = createServerEntryPoint(options);
  await main();
}
