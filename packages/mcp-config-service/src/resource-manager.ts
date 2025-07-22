import { db } from "@mcp/database";
import { ConfigCache } from "./cache.js";
import type {
  ResourceDefinition,
  ResourceRegistry,
  ConfigContext,
  IResourceManager,
  CacheOptions,
} from "./types.js";

export class ResourceManager implements IResourceManager {
  private cache: ConfigCache<ResourceRegistry>;

  constructor(cacheOptions?: CacheOptions) {
    this.cache = new ConfigCache<ResourceRegistry>(cacheOptions);
  }

  /**
   * Get all resources for an organization and server, with defaults as fallback
   */
  async getResources(context: ConfigContext): Promise<ResourceRegistry> {
    const cacheKey = context.organizationId || "default";

    // Check cache first
    const cached = this.cache.get(cacheKey, context.mcpServerId);
    if (cached) {
      return cached;
    }

    // Load defaults from database
    const defaultResources = await this.loadDefaultResources(
      context.mcpServerId
    );

    // Load custom resources from database
    const customResources = await this.loadCustomResources(context);

    // Merge with defaults (custom overrides default)
    const registry = { ...defaultResources, ...customResources };

    // Cache the result
    this.cache.set(cacheKey, context.mcpServerId, registry);

    return registry;
  }

  /**
   * Get a specific resource by URI
   */
  async getResource(
    context: ConfigContext,
    uri: string
  ): Promise<ResourceDefinition | null> {
    const resources = await this.getResources(context);
    return resources[uri] || null;
  }

  /**
   * Invalidate cache for a specific organization and server
   */
  invalidateCache(context: ConfigContext): void {
    const cacheKey = context.organizationId || "default";
    this.cache.delete(cacheKey, context.mcpServerId);
  }

  /**
   * Load default resources from database
   */
  private async loadDefaultResources(
    mcpServerId: string
  ): Promise<ResourceRegistry> {
    const defaultResources = await db.defaultResource.findMany({
      where: {
        mcpServerId: mcpServerId,
      },
    });

    const registry: ResourceRegistry = {};

    for (const resource of defaultResources) {
      registry[resource.uri] = {
        id: resource.id,
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType || undefined,
        metadata: resource.metadata
          ? (resource.metadata as Record<string, unknown>)
          : undefined,
        isActive: true,
      };
    }

    return registry;
  }

  /**
   * Load custom resources from database
   */
  private async loadCustomResources(
    context: ConfigContext
  ): Promise<ResourceRegistry> {
    // Skip custom resources if no organization context
    if (!context.organizationId) {
      return {};
    }

    const resources = await db.organizationResource.findMany({
      where: {
        organizationId: context.organizationId,
        mcpServerId: context.mcpServerId,
        isActive: true,
      },
    });

    const registry: ResourceRegistry = {};

    for (const resource of resources) {
      registry[resource.uri] = {
        id: resource.id,
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType || undefined,
        metadata: resource.metadata
          ? (resource.metadata as Record<string, unknown>)
          : undefined,
        isActive: resource.isActive,
      };
    }

    return registry;
  }

  /**
   * List all resource URIs
   */
  async listResourceUris(context: ConfigContext): Promise<string[]> {
    const resources = await this.getResources(context);
    return Object.keys(resources);
  }

  /**
   * Filter resources by mime type
   */
  async getResourcesByMimeType(
    context: ConfigContext,
    mimeType: string
  ): Promise<ResourceDefinition[]> {
    const resources = await this.getResources(context);
    return Object.values(resources).filter((r) => r.mimeType === mimeType);
  }
}
