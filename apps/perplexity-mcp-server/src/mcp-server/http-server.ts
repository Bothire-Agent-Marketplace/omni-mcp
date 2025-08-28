import type { FastifyInstance } from "fastify";
import { createMcpServerWithoutClient } from "@mcp/server-core";
import type { PerplexityServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createPerplexityHttpServer(
  config: PerplexityServerConfig
): Promise<FastifyInstance> {
  return createMcpServerWithoutClient({
    serverName: "perplexity",
    serverKey: "perplexity",
    config,
    createToolHandlers,
    getAvailableTools,
  });
}
