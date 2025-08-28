import {
  MCPJsonRpcRequest,
  MCPJsonRpcResponse,
  Session,
  McpGatewayConfig,
} from "@mcp/schemas";
import { McpLogger, postJson } from "@mcp/utils";
import { MCPProtocolAdapter } from "../protocol-adapter.js";
import { MCPServerManager } from "../server-manager.js";

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

  async routeAndExecuteRequest(
    request: MCPJsonRpcRequest,
    session: Session
  ): Promise<MCPJsonRpcResponse> {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const startTime = Date.now();

    this.logger.mcpRequest(request.method, requestId, {
      sessionId: session.id,
      requestParams: request.params,
      mcpRequestId: String(request.id),
    });

    try {
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
          serverInstance,
          requestId
        );

        const duration = Date.now() - startTime;
        this.logger.mcpResponse(request.method, requestId, true, duration, {
          sessionId: session.id,
          serverId,
          serverInstanceId: serverInstance.id,
        });

        return mcpResponse;
      } finally {
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
    serverInstance: { id: string; url: string },
    correlationId: string
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

    const mcpResponse = await postJson<MCPJsonRpcResponse>(
      `${serverInstance.url}/mcp`,
      request,
      { headers, requestId: correlationId, timeoutMs: 10000, retries: 1 }
    );
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

    if (method === "tools/call" && params?.name) {
      return params.name as string;
    }

    if (method === "resources/read" && params?.uri) {
      return params.uri as string;
    }

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
