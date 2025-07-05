import { createMcpHttpServer } from "@mcp/server-core";
import type { PerplexityServerConfig } from "../config/config.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual perplexity SDK/API client
// import { PerplexityClient } from "@perplexity/sdk";

export async function createPerplexityHttpServer(
  config: PerplexityServerConfig
) {
  // TODO: Initialize your perplexity client if you have one
  // const perplexityClient = new PerplexityClient({ apiKey: config.perplexityApiKey });

  const server = createMcpHttpServer({
    serverName: "perplexity",
    config,
    // client: perplexityClient, // Pass client to handlers if needed
    toolHandlers: createToolHandlers(),
    resourceHandlers: createResourceHandlers(),
    promptHandlers: createPromptHandlers(),
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
