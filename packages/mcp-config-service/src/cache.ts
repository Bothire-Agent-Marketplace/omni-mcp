import { LRUCache } from "lru-cache";
import type { CacheOptions } from "./types.js";

export class ConfigCache<T extends object> {
  private cache: LRUCache<string, T>;

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache<string, T>({
      max: options.maxSize || 100,
      ttl: options.ttl || 5 * 60 * 1000,
    });
  }

  private getCacheKey(organizationId: string, mcpServerId: string): string {
    return `${organizationId}:${mcpServerId}`;
  }

  get(organizationId: string, mcpServerId: string): T | undefined {
    const key = this.getCacheKey(organizationId, mcpServerId);
    return this.cache.get(key);
  }

  set(organizationId: string, mcpServerId: string, value: T): void {
    const key = this.getCacheKey(organizationId, mcpServerId);
    this.cache.set(key, value);
  }

  delete(organizationId: string, mcpServerId: string): void {
    const key = this.getCacheKey(organizationId, mcpServerId);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
