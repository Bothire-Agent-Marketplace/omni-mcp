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
import { MCPProtocolHandler } from "./core/protocol-handler.js";
import { MCPRequestRouter } from "./core/request-router.js";
import { SessionAdapter } from "./adapters/session-adapter.js";

/**
 * Refactored MCP Gateway - Main orchestrator
 *
 * Responsibilities:
 * - Initialize and coordinate focused components
 * - Handle HTTP and WebSocket connections
 * - Orchestrate request flow between components
 */
export class MCPGateway {
  private logger: McpLogger;
  private config: GatewayConfig;

  // Core components
  private serverManager: MCPServerManager;
  private protocolAdapter: MCPProtocolAdapter;
  private protocolHandler: MCPProtocolHandler;
  private requestRouter: MCPRequestRouter;
  private sessionAdapter: SessionAdapter;

  constructor(config: GatewayConfig, logger: McpLogger) {
    this.config = config;
    this.logger = logger;

    // Initialize core components
    this.serverManager = new MCPServerManager(
      config.mcpServers,
      this.logger.fork("server-manager")
    );

    this.protocolAdapter = new MCPProtocolAdapter(
      this.logger.fork("protocol-adapter")
    );

    this.sessionAdapter = new SessionAdapter(
      config,
      this.logger.fork("session-adapter")
    );

    this.protocolHandler = new MCPProtocolHandler(
      config,
      this.logger.fork("protocol-handler")
    );

    this.requestRouter = new MCPRequestRouter(
      config,
      this.serverManager,
      this.protocolAdapter,
      this.logger.fork("request-router")
    );
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
      this.sessionAdapter.shutdown();
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
      // Get or create session with organization context
      const session = await this.sessionAdapter.getOrCreateSession(headers);

      // Convert HTTP request to MCP format
      const mcpRequest = await this.protocolAdapter.handleHttpToMCP(
        requestBody as HTTPRequestBody
      );

      // Route and execute request
      const mcpResponse = await this.routeRequest(mcpRequest, session);

      // For protocol methods and MCP bridge compatibility, return JSON-RPC response directly
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
    const session = this.sessionAdapter.createWebSocketSession();
    this.sessionAdapter.attachWebSocket(session.id, ws);

    // Send initial connection success with session token
    const welcomeMessage = {
      type: "connection",
      sessionId: session.id,
      sessionToken: this.sessionAdapter.generateSessionToken(session.id),
      capabilities: this.requestRouter.getAvailableCapabilities(),
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
          const mcpResponse = await this.routeRequest(mcpRequest, session);
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
      this.sessionAdapter.removeSession(session.id);
    });

    ws.on("error", (error: Error) => {
      this.logger.error("WebSocket error:", error);
      this.sessionAdapter.removeSession(session.id);
    });
  }

  getHealthStatus(): HealthStatus {
    return this.serverManager.getHealthStatus();
  }

  /**
   * Get gateway status including session information
   */
  getGatewayStatus() {
    const serverHealth = this.serverManager.getHealthStatus();
    const sessionStats = this.sessionAdapter.getSessionStats();

    return {
      ...serverHealth,
      sessions: {
        active: sessionStats.active,
        canCreateNew: sessionStats.canCreateNew,
      },
    };
  }

  private async routeRequest(
    request: MCPRequest,
    session: Session
  ): Promise<MCPResponse> {
    // Handle core MCP protocol methods directly
    if (this.protocolHandler.isProtocolMethod(request.method)) {
      return await this.protocolHandler.handleProtocolMethod(request, session);
    }

    // Route all other requests to appropriate servers
    return await this.requestRouter.routeAndExecuteRequest(request, session);
  }
}
