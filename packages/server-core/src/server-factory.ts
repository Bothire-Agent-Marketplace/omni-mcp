import type { FastifyInstance } from "fastify";
import { ConfigLoader } from "@mcp/config-service";
import type {
  McpServerConfig,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  RequestContext,
} from "./config.js";
import { DatabaseDynamicHandlerRegistry } from "./dynamic-handlers.js";
import { createEnhancedMcpHttpServer } from "./http-server.js";

export interface McpServerFactoryConfig<TClient = unknown> {
  serverName: string;

  serverKey: string;

  config: McpServerConfig;

  client?: TClient;

  createToolHandlers: (client?: TClient) => Record<string, ToolHandler>;

  getAvailableTools: (context?: RequestContext) =>
    | Promise<
        Array<{
          name: string;
          description: string;
          inputSchema: unknown;
        }>
      >
    | Array<{
        name: string;
        description: string;
        inputSchema: unknown;
      }>;

  resourceHandlers?: Record<string, ResourceHandler>;

  promptHandlers?: Record<string, PromptHandler>;
}

export async function createMcpServer<TClient = unknown>(
  factoryConfig: McpServerFactoryConfig<TClient>
): Promise<FastifyInstance> {
  const {
    serverName,
    serverKey,
    config,
    client,
    createToolHandlers,
    getAvailableTools,
    resourceHandlers = {},
    promptHandlers = {},
  } = factoryConfig;

  const configLoader = new ConfigLoader();

  const serverId = await getServerIdFromDatabase(serverKey);

  const dynamicHandlers = new DatabaseDynamicHandlerRegistry(
    serverId,
    configLoader
  );

  const baseOptions: Parameters<
    typeof createEnhancedMcpHttpServer<TClient>
  >[0] = {
    serverName,
    config,
    dynamicHandlers,
    fallbackHandlers: {
      toolHandlers: createToolHandlers(client),
      resourceHandlers,
      promptHandlers,
    },
    getAvailableTools,
    getAvailableResources: async (context: RequestContext | undefined) => {
      return dynamicHandlers.getAvailableResources(context);
    },
    getAvailablePrompts: async (context: RequestContext | undefined) => {
      return dynamicHandlers.getAvailablePrompts(context);
    },
  };

  const options: Parameters<typeof createEnhancedMcpHttpServer<TClient>>[0] = {
    ...baseOptions,
  };
  if (client !== undefined) {
    (options as { client?: TClient }).client = client;
  }
  const server = createEnhancedMcpHttpServer<TClient>(options);

  return server;
}

/**
 * Standardized database server ID lookup with fallback
 */
async function getServerIdFromDatabase(serverKey: string): Promise<string> {
  let serverId = serverKey;

  try {
    const { PrismaClient } = await import("@mcp/database/client");
    const prisma = new PrismaClient();

    try {
      const server = await prisma.mcpServer.findUnique({
        where: { serverKey },
        select: { id: true },
      });

      if (server) {
        serverId = server.id;
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.warn(
      `Failed to get server ID from database for ${serverKey}, using fallback:`,
      error
    );
  }

  return serverId;
}

export async function createMcpServerWithClient<TClient>(
  config: Omit<McpServerFactoryConfig<TClient>, "client"> & { client: TClient }
): Promise<FastifyInstance> {
  return createMcpServer(config);
}

export async function createMcpServerWithoutClient(
  config: Omit<McpServerFactoryConfig<undefined>, "client">
): Promise<FastifyInstance> {
  return createMcpServer({ ...config, client: undefined });
}
