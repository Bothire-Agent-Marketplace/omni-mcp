import { PrismaClient } from "@mcp/database/client";
import { McpLogger } from "@mcp/utils";

export class ServerRegistry {
  private cache = new Map<string, string>();
  private prisma: PrismaClient;
  private logger: McpLogger;

  constructor(logger: McpLogger) {
    this.logger = logger;
    this.prisma = new PrismaClient();
  }

  async getServerId(serverKey: string): Promise<string> {
    if (this.cache.has(serverKey)) {
      this.logger.debug(`Using cached server ID for ${serverKey}`, {
        serverId: this.cache.get(serverKey),
      });
      return this.cache.get(serverKey)!;
    }

    try {
      const server = await this.prisma.mcpServer.findUnique({
        where: { serverKey },
        select: { id: true },
      });

      const serverId = server?.id || serverKey;

      this.cache.set(serverKey, serverId);

      this.logger.debug(`Server ID lookup for ${serverKey}`, {
        serverId,
        fromDatabase: !!server?.id,
        fallback: !server?.id,
      });

      return serverId;
    } catch (error) {
      this.logger.warn(
        `Database lookup failed for ${serverKey}, using fallback`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      this.cache.set(serverKey, serverKey);
      return serverKey;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.debug("Server registry cache cleared");
  }

  getCacheStats(): {
    size: number;
    entries: Array<{ serverKey: string; serverId: string }>;
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(
        ([serverKey, serverId]) => ({
          serverKey,
          serverId,
        })
      ),
    };
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    this.cache.clear();
    this.logger.debug("Server registry cleaned up");
  }
}

let globalServerRegistry: ServerRegistry | null = null;

export function getServerRegistry(logger: McpLogger): ServerRegistry {
  if (!globalServerRegistry) {
    globalServerRegistry = new ServerRegistry(logger);
  }
  return globalServerRegistry;
}

export async function cleanupServerRegistry(): Promise<void> {
  if (globalServerRegistry) {
    await globalServerRegistry.cleanup();
    globalServerRegistry = null;
  }
}
