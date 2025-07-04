import {
  GatewayConfig,
  MCPRequest,
  MCPResponse,
  Session,
  HealthStatus,
  IWebSocket,
  HTTPHeaders,
  HTTPRequestBody,
  GatewayHTTPResponse,
} from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";
import { MCPProtocolAdapter } from "./protocol-adapter.js";
import { MCPServerManager } from "./server-manager.js";
import { MCPSessionManager } from "./session-manager.js";

// HTTP types now imported from @mcp/schemas

// MCP Resource and Tool Types (moved to be used)
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    description?: string;
  };
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

export class MCPGateway {
  private logger: McpLogger;
  private config: GatewayConfig;
  private serverManager: MCPServerManager;
  private sessionManager: MCPSessionManager;
  private protocolAdapter: MCPProtocolAdapter;
  private capabilityMap = new Map<string, string[]>();

  constructor(config: GatewayConfig, logger: McpLogger) {
    this.config = config;
    this.logger = logger;
    this.serverManager = new MCPServerManager(
      config.mcpServers,
      this.logger.fork("server-manager")
    );
    this.sessionManager = new MCPSessionManager(
      config,
      this.logger.fork("session-manager")
    );
    this.protocolAdapter = new MCPProtocolAdapter(
      this.logger.fork("protocol-adapter")
    );

    // Build capability map
    this.buildCapabilityMap();
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing MCP Gateway...");

    try {
      await this.serverManager.initialize();
      this.logger.info("MCP Gateway initialized successfully");
    } catch (error) {
      this.logger.error(
        "Failed to initialize MCP Gateway",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down MCP Gateway...");

    try {
      await this.serverManager.shutdown();
      this.sessionManager.shutdown();
      this.logger.info("MCP Gateway shutdown complete");
    } catch (error) {
      this.logger.error(
        "Error during gateway shutdown",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async handleHttpRequest(
    requestBody: unknown,
    headers: HTTPHeaders
  ): Promise<GatewayHTTPResponse | MCPResponse> {
    try {
      // Get or create session
      let session = this.getSessionFromHeaders(headers);
      const _isNewSession = !session;

      if (!session) {
        if (!this.sessionManager.canCreateNewSession()) {
          throw new Error("Maximum concurrent sessions reached");
        }
        session = this.sessionManager.createSession();
      }

      // Convert HTTP request to MCP format
      const mcpRequest = await this.protocolAdapter.handleHttpToMCP(
        requestBody as HTTPRequestBody
      );

      // Route and execute request
      const mcpResponse = await this.routeAndExecuteRequest(
        mcpRequest,
        session
      );

      // For protocol methods, return JSON-RPC response directly
      if (this.isProtocolMethod(mcpRequest.method)) {
        return mcpResponse;
      }

      // For MCP bridge compatibility, return JSON-RPC response directly for all methods
      return mcpResponse;
    } catch (error) {
      this.logger.error(
        "HTTP request handling error",
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  handleWebSocketConnection(ws: IWebSocket): void {
    this.logger.info("New WebSocket connection established");

    // Create session for WebSocket connection
    const session = this.sessionManager.createSession(
      "websocket-user",
      "websocket"
    );
    this.sessionManager.attachWebSocket(session.id, ws);

    // Send initial connection success with session token
    const welcomeMessage = {
      type: "connection",
      sessionId: session.id,
      sessionToken: this.sessionManager.generateToken(session.id),
      capabilities: this.getAvailableCapabilities(),
    };

    ws.send(JSON.stringify(welcomeMessage));

    // Handle incoming WebSocket messages
    ws.on("message", async (data) => {
      const message = Buffer.isBuffer(data)
        ? data.toString()
        : Array.isArray(data)
          ? Buffer.concat(data).toString()
          : data;

      const mcpRequest = this.protocolAdapter.handleWebSocketMessage(
        ws,
        message as string
      );
      if (mcpRequest) {
        try {
          const mcpResponse = await this.routeAndExecuteRequest(
            mcpRequest,
            session
          );
          this.protocolAdapter.sendWebSocketResponse(ws, mcpResponse);
        } catch (error) {
          this.logger.error(
            "WebSocket message handling error",
            error instanceof Error ? error : new Error(String(error))
          );

          const errorResponse: MCPResponse = {
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal error",
              data: error instanceof Error ? error.message : "Unknown error",
            },
          };

          this.protocolAdapter.sendWebSocketResponse(ws, errorResponse);
        }
      }
    });

    ws.on("close", () => {
      this.logger.info(
        `WebSocket connection closed for session: ${session.id}`
      );
      this.sessionManager.removeSession(session.id);
    });

    ws.on("error", (error: Error) => {
      this.logger.error("WebSocket error:", error);
      this.sessionManager.removeSession(session.id);
    });
  }

  getHealthStatus(): HealthStatus {
    return this.serverManager.getHealthStatus();
  }

  private async routeAndExecuteRequest(
    request: MCPRequest,
    session: Session
  ): Promise<MCPResponse> {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const startTime = Date.now();

    // Log incoming MCP request with full details
    this.logger.mcpRequest(request.method, requestId, {
      sessionId: session.id,
      requestParams: request.params,
      mcpRequestId: String(request.id),
    });

    try {
      // Handle core MCP protocol methods directly in the gateway
      if (this.isProtocolMethod(request.method)) {
        return await this.handleProtocolMethod(request);
      }

      // Resolve capability to server for tool calls and other methods
      const serverId = this.protocolAdapter.resolveCapability(
        request,
        this.capabilityMap
      );

      this.logger.info(`Routing request to server: ${serverId}`, {
        requestId,
        method: request.method,
        serverId,
        phase: "routing_decision",
      });

      if (!serverId) {
        const capabilityToResolve = this.getCapabilityToResolve(request);
        this.logger.error(
          `No server found for capability: ${capabilityToResolve}`,
          undefined,
          {
            requestId,
            method: request.method,
            capability: capabilityToResolve,
            phase: "routing_failed",
          }
        );
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: "Method not found",
            data: `No server found for capability: ${capabilityToResolve}`,
          },
        };
      }

      // Get server instance
      const serverInstance = await this.serverManager.getServerInstance(
        serverId,
        request.method
      );

      if (!serverInstance) {
        this.logger.error(
          `No healthy server instances available for: ${serverId}`,
          undefined,
          {
            requestId,
            method: request.method,
            serverId,
            phase: "server_unavailable",
          }
        );
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32603,
            message: "Internal error",
            data: `No healthy server instances available for: ${serverId}`,
          },
        };
      }

      this.logger.info(`Executing request on server instance`, {
        requestId,
        method: request.method,
        serverId,
        serverInstanceId: serverInstance.id,
        phase: "server_execution_start",
      });

      try {
        // Execute request by forwarding it to the server's URL
        const response = await fetch(`${serverInstance.url}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        const mcpResponse = (await response.json()) as MCPResponse;

        // If the server returned an error, forward it directly (including validation errors)
        if (!response.ok || mcpResponse.error) {
          return mcpResponse;
        }

        const duration = Date.now() - startTime;
        this.logger.mcpResponse(request.method, requestId, true, duration, {
          sessionId: session.id,
          serverId,
          serverInstanceId: serverInstance.id,
        });

        return mcpResponse;
      } finally {
        // Release server instance
        this.serverManager.releaseServerInstance(serverInstance);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.mcpError(
        request.method,
        requestId,
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId: session.id,
          duration,
        }
      );

      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private getSessionFromHeaders(headers: HTTPHeaders): Session | null {
    const authHeader = headers.authorization || headers.Authorization;
    return authHeader
      ? this.sessionManager.getSessionFromAuthHeader(authHeader)
      : null;
  }

  private buildCapabilityMap(): void {
    for (const [serverId, config] of Object.entries(this.config.mcpServers)) {
      this.capabilityMap.set(serverId, config.capabilities);
    }

    this.logger.info(
      "Built capability map:",
      Object.fromEntries(this.capabilityMap.entries())
    );
  }

  private getAvailableCapabilities(): string[] {
    const allCapabilities: string[] = [];

    for (const capabilities of this.capabilityMap.values()) {
      allCapabilities.push(...capabilities);
    }

    return [...new Set(allCapabilities)].sort();
  }

  private isProtocolMethod(method: string): boolean {
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

  private getCapabilityToResolve(request: MCPRequest): string {
    const { method, params } = request;

    // For tool calls, route based on the specific tool name
    if (method === "tools/call" && params?.name) {
      return params.name as string;
    }

    // For resource reads, route based on the resource URI
    if (method === "resources/read" && params?.uri) {
      return params.uri as string;
    }

    // For prompt gets, route based on the prompt name
    if (method === "prompts/get" && params?.name) {
      return params.name as string;
    }

    return method;
  }

  private async handleProtocolMethod(
    request: MCPRequest
  ): Promise<MCPResponse> {
    switch (request.method) {
      case "initialize":
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

      case "notifications/initialized":
        // This is a notification, no response needed
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {},
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: await this.getAvailableTools(),
          },
        };

      case "resources/list":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            resources: await this.getAvailableResources(),
          },
        };

      case "prompts/list":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            prompts: await this.getAvailablePrompts(),
          },
        };

      case "ping":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {},
        };

      default:
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
  }

  private async getAvailableTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    // Fetch tools from all healthy servers
    for (const [serverId] of this.capabilityMap.entries()) {
      const serverInstance =
        await this.serverManager.getServerInstance(serverId);

      if (serverInstance) {
        try {
          const toolsRequest = {
            jsonrpc: "2.0",
            id: `tools_${Date.now()}`,
            method: "tools/list",
            params: {},
          };

          const response = await fetch(`${serverInstance.url}/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toolsRequest),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.result?.tools) {
              // Use the actual tool definitions from the server
              allTools.push(...result.result.tools);
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch tools from ${serverId}:`, {
            error: error instanceof Error ? error.message : String(error),
            serverId,
          });
        } finally {
          this.serverManager.releaseServerInstance(serverInstance);
        }
      }
    }

    return allTools;
  }

  private async getAvailableResources(): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];

    // Fetch resources from all healthy servers
    for (const [serverId] of this.capabilityMap.entries()) {
      const serverInstance =
        await this.serverManager.getServerInstance(serverId);

      if (serverInstance) {
        try {
          const resourcesRequest = {
            jsonrpc: "2.0",
            id: `resources_${Date.now()}`,
            method: "resources/list",
            params: {},
          };

          const response = await fetch(`${serverInstance.url}/mcp`, {
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
        } finally {
          this.serverManager.releaseServerInstance(serverInstance);
        }
      }
    }

    return allResources;
  }

  private async getAvailablePrompts(): Promise<MCPPrompt[]> {
    const allPrompts: MCPPrompt[] = [];

    // Fetch prompts from all healthy servers
    for (const [serverId] of this.capabilityMap.entries()) {
      const serverInstance =
        await this.serverManager.getServerInstance(serverId);

      if (serverInstance) {
        try {
          const promptsRequest = {
            jsonrpc: "2.0",
            id: `prompts_${Date.now()}`,
            method: "prompts/list",
            params: {},
          };

          const response = await fetch(`${serverInstance.url}/mcp`, {
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
        } catch {
          this.logger.warn(`Failed to fetch prompts from ${serverId}:`);
        } finally {
          this.serverManager.releaseServerInstance(serverInstance);
        }
      }
    }

    return allPrompts;
  }
}
