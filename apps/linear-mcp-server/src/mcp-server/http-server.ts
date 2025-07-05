import { LinearClient } from "@linear/sdk";
import { createMcpHttpServer, type FastifyInstance } from "@mcp/server-core";
import type { LinearServerConfig } from "../config/config.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createLinearHttpServer(
  config: LinearServerConfig
): Promise<FastifyInstance> {
  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  const server = createMcpHttpServer<LinearClient>({
    serverName: "linear",
    config,
    client: linearClient,
    toolHandlers: createToolHandlers(linearClient),
    resourceHandlers: createResourceHandlers(linearClient),
    promptHandlers: createPromptHandlers(),
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
