import type { FastifyInstance } from "fastify";
import { createMcpServerWithClient } from "@mcp/server-core";
import type { DevtoolsServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createHttpServer(
  config: DevtoolsServerConfig
): Promise<FastifyInstance> {
  return createMcpServerWithClient({
    serverName: "devtools",
    serverKey: "devtools",
    config,
    client: null,
    createToolHandlers,
    getAvailableTools,
  });
}
