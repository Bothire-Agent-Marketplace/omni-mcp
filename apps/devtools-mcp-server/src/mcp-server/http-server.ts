import { createMcpServerWithClient } from "@mcp/server-core";
import type { FastifyInstance } from "@mcp/server-core";
import type { DevtoolsServerConfig } from "../config/config.js";
import { ChromeDevToolsClient } from "./chrome-client.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

/**
 * Creates DevTools HTTP server using the consolidated MCP server factory
 * Eliminates repetitive database lookup and dynamic handler setup patterns
 */
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

  // Use consolidated factory - eliminates 40+ lines of boilerplate
  return createMcpServerWithClient({
    serverName: "devtools",
    serverKey: "devtools",
    config,
    client: chromeClient,
    createToolHandlers,
    getAvailableTools,
    // Resources and prompts are fully dynamic from database
    // No need to specify empty handlers or dynamic setup - factory handles it
  });
}
