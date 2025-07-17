import { PrismaClient } from "@mcp/database/client";
import { McpLogger } from "@mcp/utils";

/**
 * Server registry for managing MCP server database lookups with caching
 */
export class ServerRegistry {
  private cache = new Map<string, string>();
  private prisma: PrismaClient;
  private logger: McpLogger;

  constructor(logger: McpLogger) {
    this.logger = logger;
    this.prisma = new PrismaClient();
  }

  /**
   * Get server ID from database by server key, with caching and fallback
   */
  async getServerId(serverKey: string): Promise<string> {
    // Check cache first
    if (this.cache.has(serverKey)) {
      this.logger.debug(`Using cached server ID for ${serverKey}`, {
        serverId: this.cache.get(serverKey)
      });
      return this.cache.get(serverKey)!;
    }

    // Lookup from database with fallback
    try {
      const server = await this.prisma.mcpServer.findUnique({
        where: { serverKey },
        select: { id: true }
      });
      
      const serverId = server?.id || serverKey;
      
      // Cache the result
      this.cache.set(serverKey, serverId);
      
      this.logger.debug(`Server ID lookup for ${serverKey}`, {
        serverId,
        fromDatabase: !!server?.id,
        fallback: !server?.id
      });
      
      return serverId;
    } catch (error) {
      // Fallback to serverKey if database is unavailable
      this.logger.warn(`Database lookup failed for ${serverKey}, using fallback`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Cache the fallback
      this.cache.set(serverKey, serverKey);
      return serverKey;
    }
  }

  /**
   * Clear the cache (useful for testing or if server configuration changes)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug("Server registry cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ serverKey: string; serverId: string }> } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([serverKey, serverId]) => ({
        serverKey,
        serverId
      }))
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    this.cache.clear();
    this.logger.debug("Server registry cleaned up");
  }
}

// Global server registry instance
let globalServerRegistry: ServerRegistry | null = null;

/**
 * Get or create the global server registry instance
 */
export function getServerRegistry(logger: McpLogger): ServerRegistry {
  if (!globalServerRegistry) {
    globalServerRegistry = new ServerRegistry(logger);
  }
  return globalServerRegistry;
}

/**
 * Clean up the global server registry (for testing or shutdown)
 */
export async function cleanupServerRegistry(): Promise<void> {
  if (globalServerRegistry) {
    await globalServerRegistry.cleanup();
    globalServerRegistry = null;
  }
} 