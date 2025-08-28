import { z } from "zod";
import { db } from "@mcp/database";
import { ConfigCache } from "./cache.js";
import type {
  PromptTemplate,
  PromptRegistry,
  ConfigContext,
  IPromptManager,
  CacheOptions,
} from "./types.js";

export class PromptManager implements IPromptManager {
  private cache: ConfigCache<PromptRegistry>;

  constructor(cacheOptions?: CacheOptions) {
    this.cache = new ConfigCache<PromptRegistry>(cacheOptions);
  }

  async getPrompts(context: ConfigContext): Promise<PromptRegistry> {
    const cacheKey = context.organizationId || "default";

    const cached = this.cache.get(cacheKey, context.mcpServerId);
    if (cached) {
      return cached;
    }

    const defaultPrompts = await this.loadDefaultPrompts(context.mcpServerId);

    const customPrompts = await this.loadCustomPrompts(context);

    const registry = { ...defaultPrompts, ...customPrompts };

    this.cache.set(cacheKey, context.mcpServerId, registry);

    return registry;
  }

  async getPrompt(
    context: ConfigContext,
    name: string
  ): Promise<PromptTemplate | null> {
    const prompts = await this.getPrompts(context);
    return prompts[name] || null;
  }

  invalidateCache(context: ConfigContext): void {
    const cacheKey = context.organizationId || "default";
    this.cache.delete(cacheKey, context.mcpServerId);
  }

  private async loadDefaultPrompts(
    mcpServerId: string
  ): Promise<PromptRegistry> {
    const defaultPrompts = await db.defaultPrompt.findMany({
      where: {
        mcpServerId: mcpServerId,
      },
    });

    const registry: PromptRegistry = {};

    for (const prompt of defaultPrompts) {
      try {
        const template = this.parseTemplate(prompt.template);
        const argumentsSchema = this.parseArgumentsSchema(prompt.arguments);

        registry[prompt.name] = {
          id: prompt.id,
          name: prompt.name,
          description: prompt.description,
          template,
          arguments: argumentsSchema,
          version: 0,
          isActive: true,
        };
      } catch (error) {
        console.error(`Failed to parse default prompt ${prompt.name}:`, error);
      }
    }

    return registry;
  }

  private async loadCustomPrompts(
    context: ConfigContext
  ): Promise<PromptRegistry> {
    if (!context.organizationId) {
      return {};
    }

    const prompts = await db.organizationPrompt.findMany({
      where: {
        organizationId: context.organizationId,
        mcpServerId: context.mcpServerId,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
    });

    const registry: PromptRegistry = {};
    const seenNames = new Set<string>();

    for (const prompt of prompts) {
      if (!seenNames.has(prompt.name)) {
        seenNames.add(prompt.name);

        try {
          const template = this.parseTemplate(prompt.template);
          const argumentsSchema = this.parseArgumentsSchema(prompt.arguments);

          registry[prompt.name] = {
            id: prompt.id,
            name: prompt.name,
            description: prompt.description,
            template,
            arguments: argumentsSchema,
            version: prompt.version,
            isActive: prompt.isActive,
          };
        } catch (error) {
          console.error(`Failed to parse custom prompt ${prompt.name}:`, error);
        }
      }
    }

    return registry;
  }

  private parseTemplate(templateJson: unknown): PromptTemplate["template"] {
    const TemplateSchema = z.array(
      z.object({
        role: z.enum(["user", "system", "assistant"]),
        content: z.string(),
      })
    );

    return TemplateSchema.parse(templateJson);
  }

  private parseArgumentsSchema(_argumentsJson: unknown): z.ZodSchema {
    const schema = z.record(z.string(), z.unknown());
    return schema;
  }
}
