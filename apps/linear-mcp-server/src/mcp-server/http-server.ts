import { LinearClient } from "@linear/sdk";
import { 
  createEnhancedMcpHttpServer, 
  DefaultDynamicHandlerRegistry,
  type FastifyInstance 
} from "@mcp/server-core";
import { ConfigLoader } from "@mcp/config-service";
import type { LinearServerConfig } from "../config/config.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createLinearHttpServer(
  config: LinearServerConfig
): Promise<FastifyInstance> {
  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  // Create dynamic handler registry for organization-specific prompts/resources
  const configLoader = new ConfigLoader();
  
  // Get the server ID from database based on server key
  const { PrismaClient } = await import("@mcp/database/client");
  const prisma = new PrismaClient();
  
  let serverId = "linear"; // fallback to server key if database lookup fails
  try {
    const server = await prisma.mcpServer.findUnique({
      where: { serverKey: "linear" },
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
  const server = createEnhancedMcpHttpServer<LinearClient>({
    serverName: "linear",
    config,
    client: linearClient,
    dynamicHandlers,
    fallbackHandlers: {
      toolHandlers: createToolHandlers(linearClient),
      resourceHandlers: createResourceHandlers(linearClient),
      promptHandlers: createPromptHandlers(),
    },
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
