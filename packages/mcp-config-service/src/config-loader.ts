import { PromptManager } from "./prompt-manager.js";
import { ResourceManager } from "./resource-manager.js";
import type {
  ConfigContext,
  PromptRegistry,
  ResourceRegistry,
  CacheOptions,
} from "./types.js";

/**
 * Configuration loader service that manages dynamic loading of
 * organization-specific prompts and resources
 */
export class ConfigLoader {
  private promptManager: PromptManager;
  private resourceManager: ResourceManager;

  constructor(cacheOptions?: CacheOptions) {
    this.promptManager = new PromptManager(cacheOptions);
    this.resourceManager = new ResourceManager(cacheOptions);
  }

  /**
   * Load prompts for a given context
   */
  async loadPrompts(context: ConfigContext): Promise<PromptRegistry> {
    return this.promptManager.getPrompts(context);
  }

  /**
   * Load resources for a given context
   */
  async loadResources(context: ConfigContext): Promise<ResourceRegistry> {
    return this.resourceManager.getResources(context);
  }

  /**
   * Load a specific prompt
   */
  async getPrompt(context: ConfigContext, name: string) {
    return this.promptManager.getPrompt(context, name);
  }

  /**
   * Load a specific resource
   */
  async getResource(context: ConfigContext, uri: string) {
    return this.resourceManager.getResource(context, uri);
  }

  /**
   * Invalidate all caches for a given context
   */
  invalidateCache(context: ConfigContext): void {
    this.promptManager.invalidateCache(context);
    this.resourceManager.invalidateCache(context);
  }

  /**
   * Get prompt manager instance (for advanced usage)
   */
  getPromptManager(): PromptManager {
    return this.promptManager;
  }

  /**
   * Get resource manager instance (for advanced usage)
   */
  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }
}
