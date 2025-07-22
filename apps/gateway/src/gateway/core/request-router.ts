import {
  MCPJsonRpcRequest,
  MCPJsonRpcResponse,
  Session,
  McpGatewayConfig,
  isJsonRpcErrorResponse,
} from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";
import { MCPProtocolAdapter } from "../protocol-adapter.js";
import { MCPServerManager } from "../server-manager.js";

/**
 * Handles request routing to appropriate MCP servers
 * Responsible for: capability resolution, server selection, request forwarding
 */
export class MCPRequestRouter {
  private logger: McpLogger;
  private config: McpGatewayConfig;
  private serverManager: MCPServerManager;
  private protocolAdapter: MCPProtocolAdapter;
  private capabilityMap = new Map<string, string[]>();

  constructor(
    config: McpGatewayConfig,
    serverManager: MCPServerManager,
    protocolAdapter: MCPProtocolAdapter,
    logger: McpLogger
  ) {
    this.config = config;
    this.serverManager = serverManager;
    this.protocolAdapter = protocolAdapter;
    this.logger = logger.fork("request-router");

    this.buildCapabilityMap();
  }

  /**
   * Route and execute a request on the appropriate MCP server
   */
  async routeAndExecuteRequest(
    request: MCPJsonRpcRequest,
    session: Session
  ): Promise<MCPJsonRpcResponse> {
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
        return this.createRoutingErrorResponse(request, capabilityToResolve);
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
        return this.createServerUnavailableResponse(request, serverId);
      }

      this.logger.info(`Executing request on server instance`, {
        requestId,
        method: request.method,
        serverId,
        serverInstanceId: serverInstance.id,
        phase: "server_execution_start",
      });

      try {
        const mcpResponse = await this.executeOnServer(
          request,
          session,
          serverInstance
        );

        const duration = Date.now() - startTime;
        this.logger.mcpResponse(request.method, requestId, true, duration, {
          sessionId: session.id,
          serverId,
          serverInstanceId: serverInstance.id,
        });

        return mcpResponse;
      } finally {
        // Always release server instance
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

      return this.createExecutionErrorResponse(request, error);
    }
  }

  /**
   * Get available capabilities from all servers
   */
  getAvailableCapabilities(): string[] {
    const allCapabilities: string[] = [];

    for (const capabilities of this.capabilityMap.values()) {
      allCapabilities.push(...capabilities);
    }

    return [...new Set(allCapabilities)].sort();
  }

  private async executeOnServer(
    request: MCPJsonRpcRequest,
    session: Session,
    serverInstance: { id: string; url: string }
  ): Promise<MCPJsonRpcResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session.organizationId) {
      headers["x-organization-id"] = session.organizationId;
    }
    if (session.organizationClerkId) {
      headers["x-organization-clerk-id"] = session.organizationClerkId;
    }

    // Execute request by forwarding it to the server's URL
    const response = await fetch(`${serverInstance.url}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    const mcpResponse = (await response.json()) as MCPJsonRpcResponse;

    // If the server returned an error, forward it directly (including validation errors)
    if (!response.ok || isJsonRpcErrorResponse(mcpResponse)) {
      return mcpResponse;
    }

    return mcpResponse;
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

  private getCapabilityToResolve(request: MCPJsonRpcRequest): string {
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

  private createRoutingErrorResponse(
    request: MCPJsonRpcRequest,
    capability: string
  ): MCPJsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32601,
        message: "Method not found",
        data: `No server found for capability: ${capability}`,
      },
    };
  }

  private createServerUnavailableResponse(
    request: MCPJsonRpcRequest,
    serverId: string
  ): MCPJsonRpcResponse {
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

  private createExecutionErrorResponse(
    request: MCPJsonRpcRequest,
    error: unknown
  ): MCPJsonRpcResponse {
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
