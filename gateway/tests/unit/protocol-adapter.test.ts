import { ProtocolAdapter } from "../../src/gateway/protocol-adapter";
import { MCPRequest, MCPResponse } from "../../src/gateway/types";

describe("ProtocolAdapter", () => {
  let protocolAdapter: ProtocolAdapter;

  beforeEach(() => {
    protocolAdapter = new ProtocolAdapter();
  });

  describe("handleHttpToMCP", () => {
    it("should pass through valid MCP requests", async () => {
      const mcpRequest: MCPRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: { test: "data" },
      };

      const result = await protocolAdapter.handleHttpToMCP(mcpRequest);
      expect(result).toEqual(mcpRequest);
    });

    it("should convert HTTP-style requests to MCP format", async () => {
      const httpRequest = {
        action: "create",
        resource: "issues",
        params: { title: "Test Issue" },
      };

      const result = await protocolAdapter.handleHttpToMCP(httpRequest);

      expect(result.jsonrpc).toBe("2.0");
      expect(result.method).toBe("issues/create");
      expect(result.params).toEqual({ title: "Test Issue" });
      expect(result.id).toBeDefined();
    });

    it("should throw error for invalid requests", async () => {
      const invalidRequest = { invalid: "request" };

      await expect(
        protocolAdapter.handleHttpToMCP(invalidRequest)
      ).rejects.toThrow("Invalid HTTP request format for MCP conversion");
    });
  });

  describe("handleMCPToHttp", () => {
    it("should convert successful MCP response to HTTP format", async () => {
      const mcpResponse: MCPResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: { success: true, data: "test" },
      };

      const result = await protocolAdapter.handleMCPToHttp(mcpResponse);

      expect(result).toEqual({
        success: true,
        data: { success: true, data: "test" },
        id: 1,
      });
    });

    it("should convert error MCP response to HTTP format", async () => {
      const mcpResponse: MCPResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32601,
          message: "Method not found",
          data: "Additional error info",
        },
      };

      const result = await protocolAdapter.handleMCPToHttp(mcpResponse);

      expect(result).toEqual({
        success: false,
        error: "Method not found",
        code: -32601,
        data: "Additional error info",
      });
    });
  });

  describe("resolveCapability", () => {
    const availableServers = new Map([
      [
        "linear",
        ["linear/issues/create", "linear/issues/list", "linear/issues/update"],
      ],
      [
        "filesystem",
        ["filesystem/read_file", "filesystem/write_file", "filesystem/*"],
      ],
      ["database", ["db/query", "db/execute"]],
    ]);

    it("should resolve exact capability matches", () => {
      const result = protocolAdapter.resolveCapability(
        "linear/issues/create",
        availableServers
      );
      expect(result).toBe("linear");
    });

    it("should resolve wildcard patterns", () => {
      const result = protocolAdapter.resolveCapability(
        "filesystem/list_directory",
        availableServers
      );
      expect(result).toBe("filesystem");
    });

    it("should return null for unknown capabilities", () => {
      const result = protocolAdapter.resolveCapability(
        "unknown/method",
        availableServers
      );
      expect(result).toBeNull();
    });

    it("should prefer exact matches over patterns", () => {
      const serversWithOverlap = new Map([
        ["specific", ["filesystem/read_file"]],
        ["general", ["filesystem/*"]],
      ]);

      const result = protocolAdapter.resolveCapability(
        "filesystem/read_file",
        serversWithOverlap
      );
      expect(result).toBe("specific");
    });
  });

  describe("handleWebSocketMessage", () => {
    let mockWebSocket: any;

    beforeEach(() => {
      mockWebSocket = {
        send: jest.fn(),
      };
    });

    it("should parse valid MCP JSON-RPC messages", () => {
      const validMessage = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      });

      const result = protocolAdapter.handleWebSocketMessage(
        mockWebSocket,
        validMessage
      );

      expect(result).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      });
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it("should send error response for invalid JSON", () => {
      const invalidMessage = "invalid json {";

      const result = protocolAdapter.handleWebSocketMessage(
        mockWebSocket,
        invalidMessage
      );

      expect(result).toBeNull();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
            data: "Invalid JSON",
          },
        })
      );
    });

    it("should send error response for invalid MCP request", () => {
      const invalidMcpMessage = JSON.stringify({
        id: 1,
        method: "test",
        // Missing jsonrpc field
      });

      const result = protocolAdapter.handleWebSocketMessage(
        mockWebSocket,
        invalidMcpMessage
      );

      expect(result).toBeNull();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32600,
            message: "Invalid Request",
            data: "Request must be a valid MCP JSON-RPC request",
          },
        })
      );
    });
  });
});
