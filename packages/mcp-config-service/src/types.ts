import { z } from "zod";
import type {
  DefaultPrompt,
  DefaultResource,
  OrganizationPrompt,
  OrganizationResource,
} from "@mcp/database";

// ============================================================================
// BASE PRISMA TYPES
// ============================================================================

// Re-export Prisma types for direct use
export type {
  DefaultPrompt,
  DefaultResource,
  OrganizationPrompt,
  OrganizationResource,
} from "@mcp/database";

// ============================================================================
// SERVICE TYPES (Transformed from Prisma)
// ============================================================================

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
  // Additional fields for organization context
  organizationId?: string;
  isCustom?: boolean;
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
  // Additional fields for organization context
  organizationId?: string;
  isCustom?: boolean;
}

export interface ResourceRegistry {
  [uri: string]: ResourceDefinition;
}

// ============================================================================
// TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Transform DefaultPrompt from database to PromptTemplate
 */
export function transformDefaultPrompt(
  dbPrompt: DefaultPrompt
): PromptTemplate {
  return {
    id: dbPrompt.id,
    name: dbPrompt.name,
    description: dbPrompt.description,
    template: dbPrompt.template as PromptTemplate["template"],
    arguments: z.object(
      dbPrompt.arguments as unknown as Record<string, z.ZodTypeAny>
    ),
    version: 1, // Default version for system prompts
    isActive: true,
    isCustom: false,
  };
}

/**
 * Transform OrganizationPrompt from database to PromptTemplate
 */
export function transformOrganizationPrompt(
  dbPrompt: OrganizationPrompt
): PromptTemplate {
  return {
    id: dbPrompt.id,
    name: dbPrompt.name,
    description: dbPrompt.description,
    template: dbPrompt.template as PromptTemplate["template"],
    arguments: z.object(
      dbPrompt.arguments as unknown as Record<string, z.ZodTypeAny>
    ),
    version: dbPrompt.version,
    isActive: dbPrompt.isActive,
    organizationId: dbPrompt.organizationId,
    isCustom: true,
  };
}

/**
 * Transform DefaultResource from database to ResourceDefinition
 */
export function transformDefaultResource(
  dbResource: DefaultResource
): ResourceDefinition {
  return {
    id: dbResource.id,
    uri: dbResource.uri,
    name: dbResource.name,
    description: dbResource.description,
    mimeType: dbResource.mimeType || undefined,
    metadata: (dbResource.metadata as Record<string, unknown>) || undefined,
    isActive: true,
    isCustom: false,
  };
}

/**
 * Transform OrganizationResource from database to ResourceDefinition
 */
export function transformOrganizationResource(
  dbResource: OrganizationResource
): ResourceDefinition {
  return {
    id: dbResource.id,
    uri: dbResource.uri,
    name: dbResource.name,
    description: dbResource.description,
    mimeType: dbResource.mimeType || undefined,
    metadata: (dbResource.metadata as Record<string, unknown>) || undefined,
    isActive: dbResource.isActive,
    organizationId: dbResource.organizationId,
    isCustom: true,
  };
}

// ============================================================================
// MCP PROTOCOL TYPES
// ============================================================================

/**
 * MCP tools/list response format
 */
export interface McpToolsListResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
  nextCursor?: string;
}

/**
 * MCP resources/list response format
 */
export interface McpResourcesListResponse {
  resources: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
  }>;
  nextCursor?: string;
}

/**
 * MCP prompts/list response format
 */
export interface McpPromptsListResponse {
  prompts: Array<{
    name: string;
    description: string;
    arguments?: Array<{
      name: string;
      description: string;
      required?: boolean;
    }>;
  }>;
  nextCursor?: string;
}

// ============================================================================
// EXISTING TYPES (Keep for backward compatibility)
// ============================================================================

// Configuration context
export interface ConfigContext {
  organizationId: string | null; // null means load only defaults
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
