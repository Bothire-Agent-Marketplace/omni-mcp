import type { FastifyInstance } from "fastify";
import { createMcpServerWithClient } from "@mcp/server-core";
import type { DevtoolsServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

/** Creates DevTools HTTP server (Playwright-based) */
export async function createHttpServer(
  config: DevtoolsServerConfig
): Promise<FastifyInstance> {
  // Handlers manage their own browser instances (no client initialization here)

  return createMcpServerWithClient({
    serverName: "devtools",
    serverKey: "devtools",
    config,
    client: null, // Playwright handlers manage their own browser instances
    createToolHandlers,
    getAvailableTools,
    // Resources and prompts are dynamic from database
  });
}

// (Migration notes removed to keep file concise)
