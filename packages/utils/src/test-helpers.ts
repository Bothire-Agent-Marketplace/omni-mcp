import { MCPServerDefinition } from "@mcp/capabilities";
import { MCPRequest, MCPResponse } from "@mcp/schemas";

// Types for MCP test responses
interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo?: {
    name: string;
    version?: string;
  };
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface MCPResource {
  uri: string;
  name?: string;
  description?: string;
}

interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Record<string, unknown>;
}

interface MCPToolsListResult {
  tools: MCPTool[];
}

interface MCPResourcesListResult {
  resources: MCPResource[];
}

interface MCPPromptsListResult {
  prompts: MCPPrompt[];
}

export interface MCPTestServer {
  url: string;
  port: number;
  isRunning: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export class MCPTestClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async sendRequest(request: MCPRequest): Promise<MCPResponse> {
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

  async initialize(): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "mcp-test-client",
          version: "1.0.0",
        },
      },
    });
  }

  async listTools(): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
  }

  async callTool(
    name: string,
    params: Record<string, unknown> = {}
  ): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name,
        arguments: params,
      },
    });
  }

  async listResources(): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "resources/list",
      params: {},
    });
  }

  async readResource(uri: string): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "resources/read",
      params: { uri },
    });
  }

  async listPrompts(): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "prompts/list",
      params: {},
    });
  }

  async getPrompt(
    name: string,
    params: Record<string, unknown> = {}
  ): Promise<MCPResponse> {
    return this.sendRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "prompts/get",
      params: {
        name,
        arguments: params,
      },
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createStandardMCPTests(
  serverDef: MCPServerDefinition,
  testClient: MCPTestClient
) {
  return {
    async testInitialize() {
      const response = await testClient.initialize();

      if (response.error) {
        throw new Error(`Initialize failed: ${response.error.message}`);
      }

      const result = response.result as MCPInitializeResult;

      // Verify protocol version
      if (!result.protocolVersion) {
        throw new Error("Missing protocolVersion in initialize response");
      }

      // Verify capabilities
      if (!result.capabilities) {
        throw new Error("Missing capabilities in initialize response");
      }

      // Verify server info
      if (!result.serverInfo?.name) {
        throw new Error("Missing serverInfo.name in initialize response");
      }

      return result;
    },

    async testToolsList() {
      const response = await testClient.listTools();

      if (response.error) {
        throw new Error(`Tools list failed: ${response.error.message}`);
      }

      const result = response.result as MCPToolsListResult;
      const tools = result.tools || [];

      // Verify all declared tools are present
      for (const declaredTool of serverDef.tools) {
        const found = tools.find((tool) => tool.name === declaredTool);
        if (!found) {
          throw new Error(
            `Declared tool '${declaredTool}' not found in tools list`
          );
        }
      }

      return tools;
    },

    async testResourcesList() {
      const response = await testClient.listResources();

      if (response.error) {
        throw new Error(`Resources list failed: ${response.error.message}`);
      }

      const result = response.result as MCPResourcesListResult;
      const resources = result.resources || [];

      // Verify all declared resources are present
      for (const declaredResource of serverDef.resources) {
        const found = resources.find(
          (resource) =>
            resource.uri === declaredResource ||
            resource.name === declaredResource
        );
        if (!found) {
          throw new Error(
            `Declared resource '${declaredResource}' not found in resources list`
          );
        }
      }

      return resources;
    },

    async testPromptsList() {
      const response = await testClient.listPrompts();

      if (response.error) {
        throw new Error(`Prompts list failed: ${response.error.message}`);
      }

      const result = response.result as MCPPromptsListResult;
      const prompts = result.prompts || [];

      // Verify all declared prompts are present
      for (const declaredPrompt of serverDef.prompts) {
        const found = prompts.find((prompt) => prompt.name === declaredPrompt);
        if (!found) {
          throw new Error(
            `Declared prompt '${declaredPrompt}' not found in prompts list`
          );
        }
      }

      return prompts;
    },

    async testHealthCheck() {
      const isHealthy = await testClient.healthCheck();

      if (!isHealthy) {
        throw new Error("Health check failed");
      }

      return isHealthy;
    },

    async runAllTests() {
      const results = {
        initialize: null as MCPInitializeResult | null,
        tools: null as MCPTool[] | null,
        resources: null as MCPResource[] | null,
        prompts: null as MCPPrompt[] | null,
        health: null as boolean | null,
        errors: [] as string[],
      };

      try {
        results.initialize = await this.testInitialize();
      } catch (error) {
        results.errors.push(
          `Initialize: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      try {
        results.tools = await this.testToolsList();
      } catch (error) {
        results.errors.push(
          `Tools: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      try {
        results.resources = await this.testResourcesList();
      } catch (error) {
        results.errors.push(
          `Resources: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      try {
        results.prompts = await this.testPromptsList();
      } catch (error) {
        results.errors.push(
          `Prompts: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      try {
        results.health = await this.testHealthCheck();
      } catch (error) {
        results.errors.push(
          `Health: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return results;
    },
  };
}

// Utility function for testing tool calls
export async function testToolCall(
  testClient: MCPTestClient,
  toolName: string,
  params: Record<string, unknown> = {},
  shouldSucceed: boolean = true
): Promise<unknown> {
  const response = await testClient.callTool(toolName, params);

  if (shouldSucceed && response.error) {
    throw new Error(
      `Tool call '${toolName}' failed: ${response.error.message}`
    );
  }

  if (!shouldSucceed && !response.error) {
    throw new Error(`Tool call '${toolName}' should have failed but succeeded`);
  }

  return response.result;
}

// Utility function for testing resource reads
export async function testResourceRead(
  testClient: MCPTestClient,
  resourceUri: string,
  shouldSucceed: boolean = true
): Promise<unknown> {
  const response = await testClient.readResource(resourceUri);

  if (shouldSucceed && response.error) {
    throw new Error(
      `Resource read '${resourceUri}' failed: ${response.error.message}`
    );
  }

  if (!shouldSucceed && !response.error) {
    throw new Error(
      `Resource read '${resourceUri}' should have failed but succeeded`
    );
  }

  return response.result;
}
