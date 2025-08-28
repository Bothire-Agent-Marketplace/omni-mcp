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

export interface DynamicHandlerRegistry {
  getToolHandler: (
    toolName: string,
    context?: RequestContext
  ) => Promise<ToolHandler | undefined>;

  getResourceHandler: (
    uri: string,
    context?: RequestContext
  ) => Promise<ResourceHandler | undefined>;

  getPromptHandler: (
    promptName: string,
    context?: RequestContext
  ) => Promise<PromptHandler | undefined>;

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
}

export class DatabaseDynamicHandlerRegistry implements DynamicHandlerRegistry {
  private configLoader: ConfigLoader;
  private mcpServerId: string;

  constructor(mcpServerId: string, configLoader?: ConfigLoader) {
    this.mcpServerId = mcpServerId;
    this.configLoader = configLoader || new ConfigLoader();
  }

  private getConfigContext(
    context?: RequestContext
  ): ConfigContext | undefined {
    return {
      organizationId: context?.organization?.organizationId || null,
      mcpServerId: this.mcpServerId,
    };
  }

  async getToolHandler(
    _toolName: string,
    _context?: RequestContext
  ): Promise<ToolHandler | undefined> {
    return undefined;
  }

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

  private createResourceHandler(resource: ResourceDefinition): ResourceHandler {
    return async (uri: string, _context?: RequestContext) => {
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

  private createPromptHandler(prompt: PromptTemplate): PromptHandler {
    return async (args: Record<string, unknown>, _context?: RequestContext) => {
      try {
        const validatedArgs = prompt.arguments.parse(args);

        const populatedTemplate = prompt.template.map(
          (templateMessage: {
            role: "user" | "system" | "assistant";
            content: string;
          }) => {
            let processedContent = templateMessage.content;

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

  async getAvailableTools(_context?: RequestContext): Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>
  > {
    return [];
  }

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
      const resourceArray = Object.values(resources) as ResourceDefinition[];
      return resourceArray
        .filter((resource) => resource.isActive)
        .map((resource) => ({
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
      const promptArray = Object.values(prompts) as PromptTemplate[];
      return promptArray
        .filter((prompt) => prompt.isActive)
        .map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
        }));
    } catch (error) {
      console.error("Error loading prompts:", error);
      return [];
    }
  }

  invalidateCache(context?: RequestContext): void {
    const configContext = this.getConfigContext(context);
    if (configContext) {
      this.configLoader.invalidateCache(configContext);
    }
  }
}

export function createDynamicHandlerRegistry(
  mcpServerId: string,
  configLoader?: ConfigLoader
): DynamicHandlerRegistry {
  return new DatabaseDynamicHandlerRegistry(mcpServerId, configLoader);
}

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
