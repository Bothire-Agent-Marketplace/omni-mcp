import {
  ConfigLoader,
  ConfigContext,
  PromptTemplate,
  ResourceDefinition,
} from "@mcp/config-service";
import type {
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  RequestContext,
} from "./config.js";

// ============================================================================
// DYNAMIC HANDLER REGISTRY - INTERFACE & IMPLEMENTATION
// ============================================================================

/**
 * Interface for dynamic handler registries that can load handlers based on organization context
 */
export interface DynamicHandlerRegistry {
  /** Get tool handler for a specific tool name and organization context */
  getToolHandler: (
    toolName: string,
    context?: RequestContext
  ) => Promise<ToolHandler | undefined>;
  /** Get resource handler for a specific URI and organization context */
  getResourceHandler: (
    uri: string,
    context?: RequestContext
  ) => Promise<ResourceHandler | undefined>;
  /** Get prompt handler for a specific prompt name and organization context */
  getPromptHandler: (
    promptName: string,
    context?: RequestContext
  ) => Promise<PromptHandler | undefined>;
  /** Get all available tools for a given context */
  getAvailableTools: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>
  >;
  /** Get all available resources for a given context */
  getAvailableResources: (context?: RequestContext) => Promise<
    Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }>
  >;
  /** Get all available prompts for a given context */
  getAvailablePrompts: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
    }>
  >;
}

/**
 * Database-backed implementation of DynamicHandlerRegistry
 * Uses ConfigLoader to load organization-specific prompts and resources from database
 */
export class DatabaseDynamicHandlerRegistry implements DynamicHandlerRegistry {
  private configLoader: ConfigLoader;
  private mcpServerId: string;

  constructor(mcpServerId: string, configLoader?: ConfigLoader) {
    this.mcpServerId = mcpServerId;
    this.configLoader = configLoader || new ConfigLoader();
  }

  /**
   * Convert RequestContext to ConfigContext
   */
  private getConfigContext(
    context?: RequestContext
  ): ConfigContext | undefined {
    // Always return a valid ConfigContext - use null organization for defaults
    // when no organization context is available
    return {
      organizationId: context?.organization?.organizationId || null,
      mcpServerId: this.mcpServerId,
    };
  }

  /**
   * Get tool handler - tools are still handled statically for now
   * This can be extended later to support dynamic tool loading
   */
  async getToolHandler(
    _toolName: string,
    _context?: RequestContext
  ): Promise<ToolHandler | undefined> {
    // For now, tools are not loaded dynamically
    // This can be extended in the future
    return undefined;
  }

  /**
   * Get resource handler for a specific URI and organization context
   */
  async getResourceHandler(
    uri: string,
    context?: RequestContext
  ): Promise<ResourceHandler | undefined> {
    const configContext = this.getConfigContext(context);
    if (!configContext) {
      return undefined;
    }

    try {
      const resource = await this.configLoader.getResource(configContext, uri);
      if (!resource) {
        return undefined;
      }

      return this.createResourceHandler(resource);
    } catch (error) {
      console.error(`Error loading resource ${uri}:`, error);
      return undefined;
    }
  }

  /**
   * Get prompt handler for a specific prompt name and organization context
   */
  async getPromptHandler(
    promptName: string,
    context?: RequestContext
  ): Promise<PromptHandler | undefined> {
    const configContext = this.getConfigContext(context);
    if (!configContext) {
      return undefined;
    }

    try {
      const prompt = await this.configLoader.getPrompt(
        configContext,
        promptName
      );
      if (!prompt) {
        return undefined;
      }

      return this.createPromptHandler(prompt);
    } catch (error) {
      console.error(`Error loading prompt ${promptName}:`, error);
      return undefined;
    }
  }

  /**
   * Create a resource handler from a resource definition
   */
  private createResourceHandler(resource: ResourceDefinition): ResourceHandler {
    return async (uri: string, _context?: RequestContext) => {
      // For now, we return static resource information
      // This can be extended to support dynamic resource generation
      return {
        contents: [
          {
            uri,
            text: `Resource: ${resource.name}\nDescription: ${resource.description}`,
          },
        ],
      };
    };
  }

  /**
   * Create a prompt handler from a prompt template
   */
  private createPromptHandler(prompt: PromptTemplate): PromptHandler {
    return async (args: Record<string, unknown>, _context?: RequestContext) => {
      try {
        // Validate arguments against the prompt schema
        const validatedArgs = prompt.arguments.parse(args);

        // Process the template with the validated arguments
        const populatedTemplate = prompt.template.map(
          (templateMessage: {
            role: "user" | "system" | "assistant";
            content: string;
          }) => {
            let processedContent = templateMessage.content;

            // Simple template variable replacement
            // Replace {{variable}} with actual values
            if (
              validatedArgs &&
              typeof validatedArgs === "object" &&
              !Array.isArray(validatedArgs)
            ) {
              Object.entries(validatedArgs).forEach(([key, value]) => {
                if (typeof value === "string") {
                  processedContent = processedContent.replace(
                    new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
                    value
                  );
                }
              });
            }

            // Map system role to user role for compatibility
            const mappedRole =
              templateMessage.role === "system" ? "user" : templateMessage.role;

            return {
              role: mappedRole as "user" | "assistant",
              content: {
                type: "text" as const,
                text: processedContent,
              },
            };
          }
        );

        return { messages: populatedTemplate };
      } catch (error) {
        // If validation fails, return an error message
        return {
          messages: [
            {
              role: "assistant" as const,
              content: {
                type: "text" as const,
                text: `Error processing prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            },
          ],
        };
      }
    };
  }

  /**
   * Get all available tools for a given context
   */
  async getAvailableTools(_context?: RequestContext): Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>
  > {
    // For now, tools are not loaded dynamically
    // This can be extended in the future
    return [];
  }

  /**
   * Get all available resources for a given context
   */
  async getAvailableResources(context?: RequestContext): Promise<
    Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }>
  > {
    const configContext = this.getConfigContext(context);
    if (!configContext) {
      return [];
    }

    try {
      const resources = await this.configLoader.loadResources(configContext);
      return Object.values(resources)
        .filter((resource: ResourceDefinition) => resource.isActive)
        .map((resource: ResourceDefinition) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        }));
    } catch (error) {
      console.error("Error loading resources:", error);
      return [];
    }
  }

  /**
   * Get all available prompts for a given context
   */
  async getAvailablePrompts(context?: RequestContext): Promise<
    Array<{
      name: string;
      description: string;
    }>
  > {
    const configContext = this.getConfigContext(context);
    if (!configContext) {
      return [];
    }

    try {
      const prompts = await this.configLoader.loadPrompts(configContext);
      return Object.values(prompts)
        .filter((prompt: PromptTemplate) => prompt.isActive)
        .map((prompt: PromptTemplate) => ({
          name: prompt.name,
          description: prompt.description,
        }));
    } catch (error) {
      console.error("Error loading prompts:", error);
      return [];
    }
  }

  /**
   * Invalidate cache for a specific context
   */
  invalidateCache(context?: RequestContext): void {
    const configContext = this.getConfigContext(context);
    if (configContext) {
      this.configLoader.invalidateCache(configContext);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a dynamic handler registry with the ConfigLoader
 */
export function createDynamicHandlerRegistry(
  mcpServerId: string,
  configLoader?: ConfigLoader
): DynamicHandlerRegistry {
  return new DatabaseDynamicHandlerRegistry(mcpServerId, configLoader);
}

/**
 * Create enhanced handler registries that combine dynamic and static handlers
 */
export function createEnhancedHandlerRegistries(
  mcpServerId: string,
  staticHandlers: {
    toolHandlers: Record<string, ToolHandler>;
    resourceHandlers: Record<string, ResourceHandler>;
    promptHandlers: Record<string, PromptHandler>;
  },
  configLoader?: ConfigLoader
): {
  dynamicHandlers: DynamicHandlerRegistry;
  fallbackHandlers: typeof staticHandlers;
  getAvailableTools: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>
  >;
  getAvailableResources: (context?: RequestContext) => Promise<
    Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }>
  >;
  getAvailablePrompts: (context?: RequestContext) => Promise<
    Array<{
      name: string;
      description: string;
    }>
  >;
} {
  const dynamicHandlers = createDynamicHandlerRegistry(
    mcpServerId,
    configLoader
  );

  return {
    dynamicHandlers,
    fallbackHandlers: staticHandlers,
    getAvailableTools: async (context?: RequestContext) => {
      // Combine dynamic and static tools
      const dynamicTools = await dynamicHandlers.getAvailableTools(context);
      const staticTools = Object.keys(staticHandlers.toolHandlers).map(
        (name) => ({
          name,
          description: `Static tool: ${name}`,
          inputSchema: {},
        })
      );

      return [...dynamicTools, ...staticTools];
    },
    getAvailableResources: async (context?: RequestContext) => {
      // Combine dynamic and static resources
      const dynamicResources =
        await dynamicHandlers.getAvailableResources(context);
      const staticResources = Object.keys(staticHandlers.resourceHandlers).map(
        (uri) => ({
          uri,
          name: `Static resource: ${uri}`,
          description: `Static resource: ${uri}`,
        })
      );

      return [...dynamicResources, ...staticResources];
    },
    getAvailablePrompts: async (context?: RequestContext) => {
      // Combine dynamic and static prompts
      const dynamicPrompts = await dynamicHandlers.getAvailablePrompts(context);
      const staticPrompts = Object.keys(staticHandlers.promptHandlers).map(
        (name) => ({
          name,
          description: `Static prompt: ${name}`,
        })
      );

      return [...dynamicPrompts, ...staticPrompts];
    },
  };
}
