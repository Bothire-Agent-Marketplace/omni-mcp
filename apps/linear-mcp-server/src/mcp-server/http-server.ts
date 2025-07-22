import { LinearClient } from "@linear/sdk";
import { createMcpServerWithClient } from "@mcp/server-core";
import type { FastifyInstance } from "@mcp/server-core";
import type { LinearServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

/**
 * Creates Linear HTTP server using the consolidated MCP server factory
 * Eliminates repetitive database lookup and dynamic handler setup patterns
 */
export async function createLinearHttpServer(
  config: LinearServerConfig
): Promise<FastifyInstance> {
  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  // Use consolidated factory - eliminates 40+ lines of boilerplate
  return createMcpServerWithClient({
    serverName: "linear",
    serverKey: "linear",
    config,
    client: linearClient,
    createToolHandlers,
    getAvailableTools,
    // Resources and prompts are fully dynamic from database
    // No need to specify empty handlers or dynamic setup - factory handles it
  });
}
