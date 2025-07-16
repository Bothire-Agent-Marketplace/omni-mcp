import { z } from "zod";
import { db } from "@mcp/database";
import { ConfigCache } from "./cache.js";
import type {
  PromptTemplate,
  PromptRegistry,
  ConfigContext,
  IPromptManager,
  DefaultConfig,
  CacheOptions,
} from "./types.js";

export class PromptManager implements IPromptManager {
  private cache: ConfigCache<PromptRegistry>;
  private defaultPrompts: DefaultConfig<
    Omit<PromptTemplate, "id" | "version" | "isActive">
  >;

  constructor(
    defaultPrompts: DefaultConfig<
      Omit<PromptTemplate, "id" | "version" | "isActive">
    > = {},
    cacheOptions?: CacheOptions
  ) {
    this.cache = new ConfigCache<PromptRegistry>(cacheOptions);
    this.defaultPrompts = defaultPrompts;
  }

  /**
   * Get all prompts for an organization and server, with defaults as fallback
   */
  async getPrompts(context: ConfigContext): Promise<PromptRegistry> {
    // Check cache first
    const cached = this.cache.get(context.organizationId, context.mcpServerId);
    if (cached) {
      return cached;
    }

    // Load from database
    const customPrompts = await this.loadCustomPrompts(context);

    // Merge with defaults
    const registry = this.mergeWithDefaults(customPrompts);

    // Cache the result
    this.cache.set(context.organizationId, context.mcpServerId, registry);

    return registry;
  }

  /**
   * Get a specific prompt by name
   */
  async getPrompt(
    context: ConfigContext,
    name: string
  ): Promise<PromptTemplate | null> {
    const prompts = await this.getPrompts(context);
    return prompts[name] || null;
  }

  /**
   * Invalidate cache for a specific organization and server
   */
  invalidateCache(context: ConfigContext): void {
    this.cache.delete(context.organizationId, context.mcpServerId);
  }

  /**
   * Load custom prompts from database
   */
  private async loadCustomPrompts(
    context: ConfigContext
  ): Promise<PromptRegistry> {
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

    // Only keep the latest version of each prompt
    for (const prompt of prompts) {
      if (!seenNames.has(prompt.name)) {
        seenNames.add(prompt.name);

        try {
          // Parse the template and arguments from JSON
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
          console.error(`Failed to parse prompt ${prompt.name}:`, error);
          // Skip invalid prompts
        }
      }
    }

    return registry;
  }

  /**
   * Parse template from JSON
   */
  private parseTemplate(templateJson: unknown): PromptTemplate["template"] {
    const TemplateSchema = z.array(
      z.object({
        role: z.enum(["user", "system", "assistant"]),
        content: z.string(),
      })
    );

    return TemplateSchema.parse(templateJson);
  }

  /**
   * Parse arguments schema from JSON
   */
  private parseArgumentsSchema(_argumentsJson: unknown): z.ZodSchema {
    // For now, we'll store the schema definition as JSON and reconstruct it
    // In a real implementation, you might want a more sophisticated approach
    // This is a placeholder - in production, you'd need a proper schema reconstruction
    const schema = z.record(z.unknown());
    return schema;
  }

  /**
   * Merge custom prompts with defaults
   */
  private mergeWithDefaults(customPrompts: PromptRegistry): PromptRegistry {
    const registry: PromptRegistry = {};

    // Add defaults first
    for (const [name, defaultPrompt] of Object.entries(this.defaultPrompts)) {
      registry[name] = {
        ...defaultPrompt,
        id: `default-${name}`,
        version: 0,
        isActive: true,
      };
    }

    // Override with custom prompts
    for (const [name, customPrompt] of Object.entries(customPrompts)) {
      registry[name] = customPrompt;
    }

    return registry;
  }
}
