import { WebSocket } from "ws";
import { Logger } from "@mcp/utils";
import { ServerManager } from "./server-manager.js";
import { SessionManager } from "./session-manager.js";
import { ProtocolAdapter } from "./protocol-adapter.js";
import {
  MasterConfig,
  MCPRequest,
  MCPResponse,
  Session,
  HealthStatus,
} from "./types.js";

export class MCPGateway {
  private logger = Logger.getInstance("mcp-gateway-core");
  private config: MasterConfig;
  private serverManager: ServerManager;
  private sessionManager: SessionManager;
  private protocolAdapter: ProtocolAdapter;
  private capabilityMap = new Map<string, string[]>();

  constructor(config: MasterConfig) {
    this.config = config;
    this.serverManager = new ServerManager(config.servers);
    this.sessionManager = new SessionManager(config.gateway);
    this.protocolAdapter = new ProtocolAdapter();

    // Build capability map
    this.buildCapabilityMap();
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing MCP Gateway...");

    try {
      await this.serverManager.initialize();
      this.logger.info("MCP Gateway initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize MCP Gateway:", error);
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
      this.logger.error("Error during gateway shutdown:", error);
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
      this.logger.error("HTTP request handling error:", error);
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
        this.logger.debug("Received WebSocket message:", message);

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
        this.logger.error("WebSocket message handling error:", error);

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
    try {
      // Resolve capability to server
      const serverId = this.protocolAdapter.resolveCapability(
        request.method,
        this.capabilityMap
      );

      if (!serverId) {
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

      try {
        // Execute request
        const response = await this.protocolAdapter.sendMCPRequest(
          serverInstance,
          request
        );
        return response;
      } finally {
        // Release server instance
        this.serverManager.releaseServerInstance(serverInstance);
      }
    } catch (error) {
      this.logger.error("Error routing/executing request:", error);

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
