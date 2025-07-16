import { z } from "zod";

// Prompt-related types
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: {
    role: "user" | "system" | "assistant";
    content: string;
  }[];
  arguments: z.ZodSchema;
  version: number;
  isActive: boolean;
}

export interface PromptRegistry {
  [name: string]: PromptTemplate;
}

// Resource-related types
export interface ResourceDefinition {
  id: string;
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
}

export interface ResourceRegistry {
  [uri: string]: ResourceDefinition;
}

// Configuration context
export interface ConfigContext {
  organizationId: string;
  mcpServerId: string;
}

// Cache options
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
}

// Service interfaces
export interface IPromptManager {
  getPrompts(context: ConfigContext): Promise<PromptRegistry>;
  getPrompt(
    context: ConfigContext,
    name: string
  ): Promise<PromptTemplate | null>;
  invalidateCache(context: ConfigContext): void;
}

export interface IResourceManager {
  getResources(context: ConfigContext): Promise<ResourceRegistry>;
  getResource(
    context: ConfigContext,
    uri: string
  ): Promise<ResourceDefinition | null>;
  invalidateCache(context: ConfigContext): void;
}

// Default prompts and resources type
export interface DefaultConfig<T> {
  [key: string]: T;
}
