import { ConfigLoader } from "@mcp/config-service";
import {
  createEnhancedMcpHttpServer,
  DefaultDynamicHandlerRegistry,
  type FastifyInstance,
} from "@mcp/server-core";
import type { DevtoolsServerConfig } from "../config/config.js";
import { ChromeDevToolsClient } from "./chrome-client.js";
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

  // Create dynamic handler registry for organization-specific prompts/resources
  const configLoader = new ConfigLoader();

  // Get the server ID from database based on server key
  const { PrismaClient } = await import("@mcp/database/client");
  const prisma = new PrismaClient();

  let serverId = "devtools"; // fallback to server key if database lookup fails
  try {
    const server = await prisma.mcpServer.findUnique({
      where: { serverKey: "devtools" },
      select: { id: true },
    });
    if (server) {
      serverId = server.id;
    }
  } catch (error) {
    console.warn(
      "Failed to get server ID from database, using fallback:",
      error
    );
  } finally {
    await prisma.$disconnect();
  }

  const dynamicHandlers = new DefaultDynamicHandlerRegistry(
    serverId,
    configLoader
  );

  // Use enhanced server with hybrid dynamic/static approach
  // Prompts and resources: fully dynamic from database
  // Tools: static handlers for Chrome DevTools business logic
  const server = createEnhancedMcpHttpServer({
    serverName: "devtools",
    config,
    client: chromeClient,
    dynamicHandlers,
    fallbackHandlers: {
      toolHandlers: createToolHandlers(chromeClient), // Keep tools as static business logic
      resourceHandlers: {}, // Empty - resources are fully dynamic from database
      promptHandlers: {}, // Empty - prompts are fully dynamic from database
    },
    getAvailableTools,
    // Resources and prompts are handled by dynamic handlers from database
    getAvailableResources: async (context) => {
      return dynamicHandlers.getAvailableResources(context);
    },
    getAvailablePrompts: async (context) => {
      return dynamicHandlers.getAvailablePrompts(context);
    },
  });

  return server;
}
