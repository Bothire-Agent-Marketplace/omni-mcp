import { createMcpServerWithoutClient } from "@mcp/server-core";
import type { FastifyInstance } from "@mcp/server-core";
import type { PerplexityServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

/**
 * Creates Perplexity HTTP server using the consolidated MCP server factory
 * Eliminates repetitive database lookup and dynamic handler setup patterns
 */
export async function createPerplexityHttpServer(
  config: PerplexityServerConfig
): Promise<FastifyInstance> {
  // Use consolidated factory for servers without client - eliminates 40+ lines of boilerplate
  return createMcpServerWithoutClient({
    serverName: "perplexity",
    serverKey: "perplexity",
    config,
    createToolHandlers,
    getAvailableTools,
    // Resources and prompts are fully dynamic from database
    // No need to specify empty handlers or dynamic setup - factory handles it
  });
}
