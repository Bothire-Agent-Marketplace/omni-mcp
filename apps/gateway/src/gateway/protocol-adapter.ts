import { MCPRequest, MCPResponse, IWebSocket } from "@mcp/schemas";
import { createMcpLogger } from "@mcp/utils";

const logger = createMcpLogger("mcp-protocol-adapter");

export class MCPProtocolAdapter {
  handleHttpToMCP(requestBody: any): MCPRequest {
    if (
      !requestBody ||
      requestBody.jsonrpc !== "2.0" ||
      !requestBody.method
    ) {
      throw new Error("Invalid JSON-RPC request");
    }
    return requestBody;
  }

  handleMCPToHttp(mcpResponse: MCPResponse): any {
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

  handleWebSocketMessage(ws: IWebSocket, message: string): MCPRequest | null {
    try {
      const parsedMessage = JSON.parse(message);
      if (
        !parsedMessage ||
        parsedMessage.jsonrpc !== "2.0" ||
        !parsedMessage.method
      ) {
        throw new Error("Invalid JSON-RPC message");
      }
      return parsedMessage as MCPRequest;
    } catch (error) {
      logger.error(
        "Error parsing WebSocket message",
        error instanceof Error ? error : new Error(String(error))
      );
      const errorResponse: MCPResponse = {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
      };
      this.sendWebSocketResponse(ws, errorResponse);
      return null;
    }
  }

  sendWebSocketResponse(ws: IWebSocket, response: MCPResponse): void {
    try {
      ws.send(JSON.stringify(response));
    } catch (error) {
      logger.error(
        "Error sending WebSocket response",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  resolveCapability(
    request: MCPRequest,
    capabilityMap: Map<string, string[]>
  ): string | null {
    const { method, params } = request;
    logger.info(`Resolving capability for method: ${method}`, { params });

    let capabilityToResolve = method;

    // For tool calls, route based on the specific tool name
    if (method === "tools/call" && params?.name) {
      capabilityToResolve = params.name as string;
    }

    for (const [serverId, capabilities] of capabilityMap.entries()) {
      if (capabilities.includes(capabilityToResolve)) {
        logger.info(
          `Found server ${serverId} for capability ${capabilityToResolve}`
        );
        return serverId;
      }
    }

    logger.warn(`Could not resolve capability for: ${capabilityToResolve}`);
    return null;
  }
}
