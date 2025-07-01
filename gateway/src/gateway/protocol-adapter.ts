import { WebSocket } from "ws";
import { createMcpLogger } from "@mcp/utils";
import { MCPRequest, MCPResponse, ServerInstance } from "./types.js";
import fetch from "node-fetch";

export class MCPProtocolAdapter {
  private logger = createMcpLogger("mcp-gateway-protocol-adapter");

  async sendMCPRequest(
    instance: ServerInstance,
    request: MCPRequest
  ): Promise<MCPResponse> {
    if (!instance.url) {
      throw new Error(
        `No URL configured for server instance: ${instance.serverId}`
      );
    }

    // Generate unique request ID if not provided
    const requestId = request.id || this.generateRequestId();
    const mcpRequest = { ...request, id: requestId };

    const requestJson = JSON.stringify(mcpRequest);
    this.logger.debug(`Sending HTTP MCP request to ${instance.serverId}`, {
      serverId: instance.serverId,
      url: instance.url,
      request: requestJson,
    });

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${instance.url}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestJson,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const mcpResponse = (await response.json()) as MCPResponse;

      this.logger.debug(`Received MCP response from ${instance.serverId}`, {
        serverId: instance.serverId,
        responseId: mcpResponse.id,
      });

      return mcpResponse;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("MCP request timeout");
      }
      this.logger.error(
        `HTTP MCP request failed for ${instance.serverId}`,
        error
      );
      throw error;
    }
  }

  async handleHttpToMCP(httpRequest: any): Promise<MCPRequest> {
    // Convert HTTP request to MCP format
    if (this.isValidMCPRequest(httpRequest)) {
      return httpRequest as MCPRequest;
    }

    // Handle common HTTP patterns and convert to MCP
    if (httpRequest.action && httpRequest.resource) {
      return {
        jsonrpc: "2.0",
        id: this.generateRequestId(),
        method: `${httpRequest.resource}/${httpRequest.action}`,
        params: httpRequest.params || {},
      };
    }

    throw new Error("Invalid HTTP request format for MCP conversion");
  }

  async handleMCPToHttp(mcpResponse: MCPResponse): Promise<any> {
    // Convert MCP response to HTTP-friendly format
    if (mcpResponse.error) {
      return {
        success: false,
        error: mcpResponse.error.message,
        code: mcpResponse.error.code,
        data: mcpResponse.error.data,
      };
    }

    return {
      success: true,
      data: mcpResponse.result,
      id: mcpResponse.id,
    };
  }

  handleWebSocketMessage(ws: WebSocket, message: string): MCPRequest | null {
    try {
      const data = JSON.parse(message);

      if (this.isValidMCPRequest(data)) {
        return data as MCPRequest;
      }

      // Send error back via WebSocket
      const errorResponse: MCPResponse = {
        jsonrpc: "2.0",
        id: data.id || null,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: "Request must be a valid MCP JSON-RPC request",
        },
      };

      ws.send(JSON.stringify(errorResponse));
      return null;
    } catch (error) {
      this.logger.error(
        "Error parsing WebSocket message",
        error instanceof Error ? error : new Error(String(error))
      );

      const errorResponse: MCPResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: "Invalid JSON",
        },
      };

      ws.send(JSON.stringify(errorResponse));
      return null;
    }
  }

  sendWebSocketResponse(ws: WebSocket, response: MCPResponse): void {
    try {
      ws.send(JSON.stringify(response));
    } catch (error) {
      this.logger.error(
        "Error sending WebSocket response",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private isValidMCPRequest(data: any): boolean {
    return (
      data &&
      data.jsonrpc === "2.0" &&
      typeof data.method === "string" &&
      (data.id === undefined ||
        typeof data.id === "string" ||
        typeof data.id === "number")
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method resolution - maps capabilities to server IDs
  resolveCapability(
    method: string,
    availableServers: Map<string, string[]>
  ): string | null {
    for (const [serverId, capabilities] of availableServers.entries()) {
      // Exact match first
      if (capabilities.includes(method)) {
        return serverId;
      }

      // Pattern match (e.g., "linear/issues/create" matches "linear/*")
      for (const capability of capabilities) {
        if (this.matchesCapabilityPattern(method, capability)) {
          return serverId;
        }
      }
    }

    return null;
  }

  private matchesCapabilityPattern(method: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")
      .replace(/\//g, "\\/");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(method);
  }
}
