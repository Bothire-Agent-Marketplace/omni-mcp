import { MCPJsonRpcResponse } from "@mcp/schemas";

export class MCPClient {
  private baseUrl: string;
  private nextId = 1;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  private generateId(): number {
    return this.nextId++;
  }

  private async makeRequest(
    method: string,
    params?: unknown
  ): Promise<MCPJsonRpcResponse> {
    const request: {
      jsonrpc: string;
      method: string;
      id: number;
      params?: unknown;
    } = {
      jsonrpc: "2.0",
      method,
      id: this.generateId(),
    };

    if (params) {
      request.params = params;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listTools(): Promise<MCPJsonRpcResponse> {
    return this.makeRequest("tools/list");
  }

  async listResources(): Promise<MCPJsonRpcResponse> {
    return this.makeRequest("resources/list");
  }

  async listPrompts(): Promise<MCPJsonRpcResponse> {
    return this.makeRequest("prompts/list");
  }

  async callTool(
    name: string,
    args: unknown = {}
  ): Promise<MCPJsonRpcResponse> {
    return this.makeRequest("tools/call", {
      name,
      arguments: args,
    });
  }

  async readResource(uri: string): Promise<MCPJsonRpcResponse> {
    return this.makeRequest("resources/read", {
      uri,
    });
  }

  async getPrompt(
    name: string,
    args: unknown = {}
  ): Promise<MCPJsonRpcResponse> {
    return this.makeRequest("prompts/get", {
      name,
      arguments: args,
    });
  }

  async checkHealth(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }
}
