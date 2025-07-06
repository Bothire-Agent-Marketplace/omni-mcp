import { createMcpHttpServer, type FastifyInstance } from "@mcp/server-core";
import type { DevtoolsServerConfig } from "../config/config.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual devtools SDK/API client
// import { DevtoolsClient } from "@devtools/sdk";

export async function createDevtoolsHttpServer(
  config: DevtoolsServerConfig
): Promise<FastifyInstance> {
  // TODO: Initialize your devtools client
  // const devtoolsClient = new DevtoolsClient({ apiKey: config.devtoolsApiKey });

  const server = createMcpHttpServer({
    serverName: "devtools",
    config,
    client: undefined, // devtoolsClient,
    toolHandlers: createToolHandlers(/* devtoolsClient */),
    resourceHandlers: createResourceHandlers(/* devtoolsClient */),
    promptHandlers: createPromptHandlers(),
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
