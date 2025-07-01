import { WebSocket } from "ws";
import { MCPServerManager } from "./server-manager.js";
import { MCPSessionManager } from "./session-manager.js";
import { MCPProtocolAdapter } from "./protocol-adapter.js";
import { createMcpLogger } from "@mcp/utils";
import {
  MasterConfig,
  MCPRequest,
  MCPResponse,
  Session,
  HealthStatus,
} from "./types.js";

export class MCPGateway {
  private logger = createMcpLogger("mcp-gateway-core");
  private config: MasterConfig;
  private serverManager: MCPServerManager;
  private sessionManager: MCPSessionManager;
  private protocolAdapter: MCPProtocolAdapter;
  private capabilityMap = new Map<string, string[]>();

  constructor(config: MasterConfig) {
    this.config = config;
    this.serverManager = new MCPServerManager(config.servers);
    this.sessionManager = new MCPSessionManager(config.gateway);
    this.protocolAdapter = new MCPProtocolAdapter();

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

  async handleHttpRequest(requestBody: any, headers: any): Promise<any> {
    try {
      // Get or create session
      let session = this.getSessionFromHeaders(headers);

      if (!session) {
        if (!this.sessionManager.canCreateNewSession()) {
          throw new Error("Maximum concurrent sessions reached");
        }
        session = this.sessionManager.createSession();
      }

      // Convert HTTP request to MCP format
      const mcpRequest = await this.protocolAdapter.handleHttpToMCP(
        requestBody
      );

      // Route and execute request
      const mcpResponse = await this.routeAndExecuteRequest(
        mcpRequest,
        session
      );

      // Convert MCP response back to HTTP format
      const httpResponse = await this.protocolAdapter.handleMCPToHttp(
        mcpResponse
      );

      // Include session token in response for new sessions
      if (!this.getSessionFromHeaders(headers)) {
        httpResponse.sessionToken = this.sessionManager.generateToken(
          session.id
        );
      }

      return httpResponse;
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

  handleWebSocketConnection(ws: WebSocket): void {
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

    ws.on("message", async (data: Buffer) => {
      try {
        const message = data.toString();
        this.logger.debug("Received WebSocket message", { message });

        const mcpRequest = this.protocolAdapter.handleWebSocketMessage(
          ws,
          message
        );
        if (!mcpRequest) return; // Error already sent by protocol adapter

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
    });

    ws.on("close", () => {
      this.logger.info(
        `WebSocket connection closed for session: ${session.id}`
      );
      this.sessionManager.removeSession(session.id);
    });

    ws.on("error", (error) => {
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
      // Resolve capability to server
      const serverId = this.protocolAdapter.resolveCapability(
        request.method,
        this.capabilityMap
      );

      this.logger.info(`Routing request to server: ${serverId}`, {
        requestId,
        method: request.method,
        serverId,
        phase: "routing_decision",
      });

      if (!serverId) {
        this.logger.error(
          `No server found for capability: ${request.method}`,
          undefined,
          {
            requestId,
            method: request.method,
            phase: "routing_failed",
          }
        );
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: "Method not found",
            data: `No server found for capability: ${request.method}`,
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

        if (!response.ok) {
          throw new Error(
            `Request to ${serverInstance.serverId} failed with status ${response.status}`
          );
        }

        const mcpResponse = (await response.json()) as MCPResponse;

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

  private getSessionFromHeaders(headers: any): Session | null {
    const authHeader = headers.authorization || headers.Authorization;
    return this.sessionManager.getSessionFromAuthHeader(authHeader);
  }

  private buildCapabilityMap(): void {
    for (const [serverId, config] of Object.entries(this.config.servers)) {
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
}
