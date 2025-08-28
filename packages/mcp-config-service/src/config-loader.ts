import { PromptManager } from "./prompt-manager.js";
import { ResourceManager } from "./resource-manager.js";
import type {
  ConfigContext,
  PromptRegistry,
  ResourceRegistry,
  CacheOptions,
} from "./types.js";

export class ConfigLoader {
  private promptManager: PromptManager;
  private resourceManager: ResourceManager;

  constructor(cacheOptions?: CacheOptions) {
    this.promptManager = new PromptManager(cacheOptions);
    this.resourceManager = new ResourceManager(cacheOptions);
  }

  async loadPrompts(context: ConfigContext): Promise<PromptRegistry> {
    return this.promptManager.getPrompts(context);
  }

  async loadResources(context: ConfigContext): Promise<ResourceRegistry> {
    return this.resourceManager.getResources(context);
  }

  async getPrompt(context: ConfigContext, name: string) {
    return this.promptManager.getPrompt(context, name);
  }

  async getResource(context: ConfigContext, uri: string) {
    return this.resourceManager.getResource(context, uri);
  }

  invalidateCache(context: ConfigContext): void {
    this.promptManager.invalidateCache(context);
    this.resourceManager.invalidateCache(context);
  }

  getPromptManager(): PromptManager {
    return this.promptManager;
  }

  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }
}
