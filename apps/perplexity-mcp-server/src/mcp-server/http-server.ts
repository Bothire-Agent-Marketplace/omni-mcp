import { 
  createEnhancedMcpHttpServer, 
  DefaultDynamicHandlerRegistry,
  type FastifyInstance 
} from "@mcp/server-core";
import { ConfigLoader } from "@mcp/config-service";
import type { PerplexityServerConfig } from "../config/config.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual perplexity SDK/API client
// import { PerplexityClient } from "@perplexity/sdk";

export async function createPerplexityHttpServer(
  config: PerplexityServerConfig
): Promise<FastifyInstance> {
  // TODO: Initialize your perplexity client if you have one
  // const perplexityClient = new PerplexityClient({ apiKey: config.perplexityApiKey });

  // Create dynamic handler registry for organization-specific prompts/resources
  const configLoader = new ConfigLoader();
  
  // Get the server ID from database based on server key
  const { PrismaClient } = await import("@mcp/database/client");
  const prisma = new PrismaClient();
  
  let serverId = "perplexity"; // fallback to server key if database lookup fails
  try {
    const server = await prisma.mcpServer.findUnique({
      where: { serverKey: "perplexity" },
      select: { id: true }
    });
    if (server) {
      serverId = server.id;
    }
  } catch (error) {
    console.warn("Failed to get server ID from database, using fallback:", error);
  } finally {
    await prisma.$disconnect();
  }
  
  const dynamicHandlers = new DefaultDynamicHandlerRegistry(serverId, configLoader);

  // Use enhanced server with dynamic handlers for organization-specific prompts/resources
  const server = createEnhancedMcpHttpServer({
    serverName: "perplexity",
    config,
    // client: perplexityClient, // Pass client to handlers if needed
    dynamicHandlers,
    fallbackHandlers: {
      toolHandlers: createToolHandlers(),
      resourceHandlers: createResourceHandlers(),
      promptHandlers: createPromptHandlers(),
    },
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
