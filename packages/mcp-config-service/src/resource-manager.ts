import { db } from "@mcp/database";
import { ConfigCache } from "./cache.js";
import type {
  ResourceDefinition,
  ResourceRegistry,
  ConfigContext,
  IResourceManager,
  DefaultConfig,
  CacheOptions,
} from "./types.js";

export class ResourceManager implements IResourceManager {
  private cache: ConfigCache<ResourceRegistry>;
  private defaultResources: DefaultConfig<
    Omit<ResourceDefinition, "id" | "isActive">
  >;

  constructor(
    defaultResources: DefaultConfig<
      Omit<ResourceDefinition, "id" | "isActive">
    > = {},
    cacheOptions?: CacheOptions
  ) {
    this.cache = new ConfigCache<ResourceRegistry>(cacheOptions);
    this.defaultResources = defaultResources;
  }

  /**
   * Get all resources for an organization and server, with defaults as fallback
   */
  async getResources(context: ConfigContext): Promise<ResourceRegistry> {
    // Check cache first
    const cached = this.cache.get(context.organizationId, context.mcpServerId);
    if (cached) {
      return cached;
    }

    // Load from database
    const customResources = await this.loadCustomResources(context);

    // Merge with defaults
    const registry = this.mergeWithDefaults(customResources);

    // Cache the result
    this.cache.set(context.organizationId, context.mcpServerId, registry);

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
    this.cache.delete(context.organizationId, context.mcpServerId);
  }

  /**
   * Load custom resources from database
   */
  private async loadCustomResources(
    context: ConfigContext
  ): Promise<ResourceRegistry> {
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
   * Merge custom resources with defaults
   */
  private mergeWithDefaults(
    customResources: ResourceRegistry
  ): ResourceRegistry {
    const registry: ResourceRegistry = {};

    // Add defaults first
    for (const [uri, defaultResource] of Object.entries(
      this.defaultResources
    )) {
      registry[uri] = {
        ...defaultResource,
        id: `default-${uri.replace(/[^a-zA-Z0-9]/g, "-")}`,
        isActive: true,
      };
    }

    // Override with custom resources or add new ones
    for (const [uri, customResource] of Object.entries(customResources)) {
      registry[uri] = customResource;
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
