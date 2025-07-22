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

/**
 * Configuration for creating an MCP server
 */
export interface McpServerFactoryConfig<TClient = unknown> {
  /** Server name (e.g., "linear", "devtools", "perplexity") */
  serverName: string;

  /** Server key for database lookups */
  serverKey: string;

  /** Server configuration */
  config: McpServerConfig;

  /** Optional client instance (e.g., LinearClient, ChromeDevToolsClient) */
  client?: TClient;

  /** Tool handlers factory function */
  createToolHandlers: (client?: TClient) => Record<string, ToolHandler>;

  /** Available tools getter */
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

  /** Optional resource handlers (defaults to empty - uses dynamic handlers) */
  resourceHandlers?: Record<string, ResourceHandler>;

  /** Optional prompt handlers (defaults to empty - uses dynamic handlers) */
  promptHandlers?: Record<string, PromptHandler>;
}

/**
 * Creates a standardized MCP HTTP server with consistent patterns
 * Eliminates duplicate code across Linear, DevTools, Perplexity, etc.
 */
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

  // Create dynamic handler registry for organization-specific prompts/resources
  const configLoader = new ConfigLoader();

  // Get the server ID from database based on server key (standardized pattern)
  const serverId = await getServerIdFromDatabase(serverKey);

  const dynamicHandlers = new DatabaseDynamicHandlerRegistry(
    serverId,
    configLoader
  );

  // Use enhanced server with hybrid dynamic/static approach
  // Prompts and resources: fully dynamic from database
  // Tools: static handlers for business logic
  const server = createEnhancedMcpHttpServer<TClient>({
    serverName,
    config,
    client,
    dynamicHandlers,
    fallbackHandlers: {
      toolHandlers: createToolHandlers(client), // Business logic handlers
      resourceHandlers, // Usually empty - resources from database
      promptHandlers, // Usually empty - prompts from database
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

/**
 * Standardized database server ID lookup with fallback
 */
async function getServerIdFromDatabase(serverKey: string): Promise<string> {
  let serverId = serverKey; // fallback to server key if database lookup fails

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

/**
 * Creates an MCP server with a typed client (e.g., LinearClient, ChromeDevToolsClient)
 */
export async function createMcpServerWithClient<TClient>(
  config: Omit<McpServerFactoryConfig<TClient>, "client"> & { client: TClient }
): Promise<FastifyInstance> {
  return createMcpServer(config);
}

/**
 * Creates an MCP server without a client (e.g., Perplexity server using HTTP APIs)
 */
export async function createMcpServerWithoutClient(
  config: Omit<McpServerFactoryConfig<undefined>, "client">
): Promise<FastifyInstance> {
  return createMcpServer({ ...config, client: undefined });
}
