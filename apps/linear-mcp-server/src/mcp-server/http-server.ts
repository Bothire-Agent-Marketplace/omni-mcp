import { LinearClient } from "@linear/sdk";
import type { FastifyInstance } from "fastify";
import { createMcpServerWithClient } from "@mcp/server-core";
import type { LinearServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createLinearHttpServer(
  config: LinearServerConfig
): Promise<FastifyInstance> {
  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  return createMcpServerWithClient({
    serverName: "linear",
    serverKey: "linear",
    config,
    client: linearClient,
    createToolHandlers,
    getAvailableTools,
  });
}
