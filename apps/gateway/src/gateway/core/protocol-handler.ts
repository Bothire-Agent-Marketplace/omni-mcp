import { MCPRequest, MCPResponse, Session, GatewayConfig } from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";

// MCP Protocol Types
interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

/**
 * Handles core MCP protocol methods
 * Responsible for: initialize, tools/list, resources/list, prompts/list, ping
 */
export class MCPProtocolHandler {
  private logger: McpLogger;
  private config: GatewayConfig;

  constructor(config: GatewayConfig, logger: McpLogger) {
    this.config = config;
    this.logger = logger.fork("protocol-handler");
  }

  /**
   * Check if a method is a core protocol method handled by this class
   */
  isProtocolMethod(method: string): boolean {
    const protocolMethods = [
      "initialize",
      "notifications/initialized",
      "tools/list",
      "resources/list",
      "prompts/list",
      "ping",
    ];
    return protocolMethods.includes(method);
  }

  /**
   * Handle core MCP protocol methods
   */
  async handleProtocolMethod(
    request: MCPRequest,
    session?: Session
  ): Promise<MCPResponse> {
    switch (request.method) {
      case "initialize":
        return this.handleInitialize(request);

      case "notifications/initialized":
        return this.handleInitialized(request);

      case "tools/list":
        return this.handleToolsList(request);

      case "resources/list":
        return this.handleResourcesList(request);

      case "prompts/list":
        return this.handlePromptsList(request, session);

      case "ping":
        return this.handlePing(request);

      default:
        return this.handleUnknownMethod(request);
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: "omni-mcp-gateway",
          version: "1.0.0",
        },
      },
    };
  }

  private handleInitialized(request: MCPRequest): MCPResponse {
    // This is a notification, no response needed
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {},
    };
  }

  private async handleToolsList(request: MCPRequest): Promise<MCPResponse> {
    try {
      const tools = await this.getAvailableTools();
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { tools },
      };
    } catch (error) {
      return this.createErrorResponse(request.id, error);
    }
  }

  private async handleResourcesList(request: MCPRequest): Promise<MCPResponse> {
    try {
      const resources = await this.getAvailableResources();
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { resources },
      };
    } catch (error) {
      return this.createErrorResponse(request.id, error);
    }
  }

  private async handlePromptsList(
    request: MCPRequest,
    session?: Session
  ): Promise<MCPResponse> {
    try {
      const prompts = await this.getAvailablePrompts(session);
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { prompts },
      };
    } catch (error) {
      return this.createErrorResponse(request.id, error);
    }
  }

  private handlePing(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {},
    };
  }

  private handleUnknownMethod(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32601,
        message: "Method not found",
        data: `Protocol method ${request.method} not implemented`,
      },
    };
  }

  private async getAvailableTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    // Fetch tools from all configured servers
    for (const [serverId, config] of Object.entries(this.config.mcpServers)) {
      try {
        const toolsRequest = {
          jsonrpc: "2.0",
          id: `tools_${Date.now()}`,
          method: "tools/list",
          params: {},
        };

        const response = await fetch(`${config.url}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toolsRequest),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result?.tools) {
            allTools.push(...result.result.tools);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch tools from ${serverId}:`, {
          error: error instanceof Error ? error.message : String(error),
          serverId,
        });
      }
    }

    return allTools;
  }

  private async getAvailableResources(): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];

    // Fetch resources from all configured servers
    for (const [serverId, config] of Object.entries(this.config.mcpServers)) {
      try {
        const resourcesRequest = {
          jsonrpc: "2.0",
          id: `resources_${Date.now()}`,
          method: "resources/list",
          params: {},
        };

        const response = await fetch(`${config.url}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resourcesRequest),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result?.resources) {
            allResources.push(...result.result.resources);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch resources from ${serverId}:`, {
          error: error instanceof Error ? error.message : String(error),
          serverId,
        });
      }
    }

    return allResources;
  }

  private async getAvailablePrompts(session?: Session): Promise<MCPPrompt[]> {
    const allPrompts: MCPPrompt[] = [];

    // Fetch prompts from all configured servers
    for (const [serverId, config] of Object.entries(this.config.mcpServers)) {
      try {
        const promptsRequest = {
          jsonrpc: "2.0",
          id: `prompts_${Date.now()}`,
          method: "prompts/list",
          params: {},
        };

        const response = await fetch(`${config.url}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promptsRequest),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result?.prompts) {
            allPrompts.push(...result.result.prompts);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch prompts from ${serverId}:`, {
          error: error instanceof Error ? error.message : String(error),
          serverId,
        });
      }
    }

    // Fetch custom organization prompts if session has org context
    if (session?.organizationId) {
      try {
        const customPrompts = await this.getCustomPrompts(
          session.organizationId
        );
        allPrompts.push(...customPrompts);
      } catch (error) {
        this.logger.warn("Failed to fetch custom prompts:", {
          error: error instanceof Error ? error.message : String(error),
          organizationId: session.organizationId,
        });
      }
    }

    return allPrompts;
  }

  private async getCustomPrompts(organizationId: string): Promise<MCPPrompt[]> {
    const { PrismaClient } = await import("@mcp/database/client");
    const prisma = new PrismaClient();

    try {
      const customPrompts = await prisma.organizationPrompt.findMany({
        where: { organizationId },
        include: { mcpServer: true },
      });

      const mcpCustomPrompts: MCPPrompt[] = customPrompts.map((prompt) => {
        // Parse arguments from stored JSON
        let arguments_array: Array<{
          name: string;
          description: string;
          required?: boolean;
        }> = [];

        try {
          const argsSchema = prompt.arguments as Record<string, unknown>;
          if (argsSchema && typeof argsSchema === "object") {
            arguments_array = Object.entries(argsSchema).map(
              ([name, config]: [string, unknown]) => ({
                name,
                description:
                  (config as { description?: string }).description || "",
                required: (config as { required?: boolean }).required || false,
              })
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to parse arguments for custom prompt ${prompt.name}:`,
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }

        return {
          name: `custom_${prompt.name}`, // Prefix to distinguish from default prompts
          description: prompt.description,
          arguments: arguments_array,
        };
      });

      this.logger.info(
        `Added ${mcpCustomPrompts.length} custom prompts for organization ${organizationId}`
      );

      return mcpCustomPrompts;
    } finally {
      await prisma.$disconnect();
    }
  }

  private createErrorResponse(
    requestId: string | number | undefined,
    error: unknown
  ): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
