import { createMcpHttpServer, type FastifyInstance } from "@mcp/server-core";
import type { DevtoolsServerConfig } from "../config/config.js";
import { ChromeDevToolsClient } from "./chrome-client.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual devtools SDK/API client
// import { DevtoolsClient } from "@devtools/sdk";

export async function createDevtoolsHttpServer(
  config: DevtoolsServerConfig
): Promise<FastifyInstance> {
  // Initialize Chrome DevTools client with browser configuration
  const chromeClient = new ChromeDevToolsClient({
    port: config.chromePort || 9222,
    headless: false, // Allow visible browser for debugging
    autoConnect: false, // Don't auto-connect on startup
    chromePath: config.browserPath, // Custom browser path if specified
  });

  const server = createMcpHttpServer({
    serverName: "devtools",
    config,
    client: chromeClient,
    toolHandlers: createToolHandlers(chromeClient),
    resourceHandlers: createResourceHandlers(chromeClient),
    promptHandlers: createPromptHandlers(),
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
