import { z } from "zod";

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

  organizationId?: string;
  isCustom?: boolean;
}

export interface PromptRegistry {
  [name: string]: PromptTemplate;
}

export interface ResourceDefinition {
  id: string;
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;

  organizationId?: string;
  isCustom?: boolean;
}

export interface ResourceRegistry {
  [uri: string]: ResourceDefinition;
}

type DefaultPromptModel = {
  id: string;
  name: string;
  description: string;
  template: unknown;
  arguments: unknown;
};

type OrganizationPromptModel = DefaultPromptModel & {
  version: number;
  isActive: boolean;
  organizationId: string;
};

type DefaultResourceModel = {
  id: string;
  uri: string;
  name: string;
  description: string;
  mimeType: string | null;
  metadata?: unknown;
};

type OrganizationResourceModel = DefaultResourceModel & {
  isActive: boolean;
  organizationId: string;
};

export function transformDefaultPrompt(
  dbPrompt: DefaultPromptModel
): PromptTemplate {
  return {
    id: dbPrompt.id,
    name: dbPrompt.name,
    description: dbPrompt.description,
    template: dbPrompt.template as PromptTemplate["template"],
    arguments: z.object(
      dbPrompt.arguments as unknown as Record<string, z.ZodTypeAny>
    ),
    version: 1,
    isActive: true,
    isCustom: false,
  };
}

export function transformOrganizationPrompt(
  dbPrompt: OrganizationPromptModel
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

export function transformDefaultResource(
  dbResource: DefaultResourceModel
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

export function transformOrganizationResource(
  dbResource: OrganizationResourceModel
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

export interface McpListResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export type McpToolsListResponse = McpListResponse<McpTool>;
export type McpResourcesListResponse = McpListResponse<McpResource>;
export type McpPromptsListResponse = McpListResponse<McpPrompt>;

export interface ConfigContext {
  organizationId: string | null;
  mcpServerId: string;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

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

export interface DefaultConfig<T> {
  [key: string]: T;
}
