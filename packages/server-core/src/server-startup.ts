import { createMcpLogger, type Environment } from "@mcp/utils";
import type { ServerStartupOptions } from "./config.js";

// ============================================================================
// GENERIC MCP SERVER STARTUP
// ============================================================================

/**
 * Starts an MCP server with standard logging and error handling
 */
export async function startMcpServer(
  options: ServerStartupOptions
): Promise<void> {
  const { serverName, config, createServer } = options;

  const logger = createMcpLogger({
    serverName: `${serverName}-http-server`,
    logLevel: config.logLevel,
    environment: config.env,
  });

  try {
    const server = await createServer();
    const { port, host } = config;

    await server.listen({ port, host });

    logger.info(`🚀 ${serverName} MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error starting server";
    logger.error("Error starting server", new Error(errorMessage));
    process.exit(1);
  }
}

/**
 * Creates a server startup function with pre-configured options
 */
export function createServerStarter<
  TConfig extends {
    port: number;
    host: string;
    logLevel: string;
    env: Environment;
  },
>(
  serverName: string,
  serverFactory: (config: TConfig) => Promise<import("fastify").FastifyInstance>
) {
  return async (config: TConfig): Promise<void> => {
    await startMcpServer({
      serverName,
      config,
      createServer: () => serverFactory(config),
    });
  };
}
