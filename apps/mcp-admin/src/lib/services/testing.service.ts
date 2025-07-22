// Testing Service - Handles MCP testing operations
// Follows the established service pattern in the codebase

export interface McpTestCapabilities {
  operations: string[];
  tools: Array<{ name: string; description?: string }>;
  prompts: Array<{ name: string; description?: string }>;
  resources: Array<{ uri: string; name?: string; description?: string }>;
  healthTargets: string[];
}

export interface McpTestResult {
  success: boolean;
  operation: string;
  target: string;
  responseTime: number;
  timestamp: string;
  result?: unknown;
  error?: string;
  metadata?: {
    organizationContext?: unknown;
    gatewayUrl?: string;
    serverHealth?: unknown;
  };
}

interface McpTestRequest {
  operation: "tool" | "prompt" | "resource" | "health";
  target: string;
  arguments?: Record<string, unknown>;
  organizationContext?: {
    organizationId?: string;
    organizationClerkId?: string;
    simulate?: boolean;
  };
  options?: {
    timeout?: number;
    validateResponse?: boolean;
    includeMetadata?: boolean;
  };
}

export class TestingService {
  private baseUrl: string;
  private sessionId: string | null = null;
  private lastSessionTime: number = 0;
  private SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.baseUrl = "/api/test";
    // Generate a session ID that will be reused
    this.sessionId = `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get headers with session management
   */
  private getHeaders(): Record<string, string> {
    const now = Date.now();

    // Refresh session ID if it's been too long (prevents stale sessions)
    if (now - this.lastSessionTime > this.SESSION_TIMEOUT) {
      this.sessionId = `test-session-${now}-${Math.random().toString(36).substr(2, 9)}`;
    }

    this.lastSessionTime = now;

    return {
      "Content-Type": "application/json",
      "X-Session-ID": this.sessionId!,
      "X-Client-Type": "mcp-admin-testing",
    };
  }

  /**
   * Load available MCP capabilities
   */
  async loadCapabilities(organizationContext?: {
    organizationClerkId?: string;
    simulate?: boolean;
  }): Promise<McpTestCapabilities> {
    // Build URL with query params for organization context simulation
    const url = new URL(`${this.baseUrl}/mcp`, window.location.origin);

    if (
      organizationContext?.simulate &&
      organizationContext?.organizationClerkId
    ) {
      url.searchParams.set(
        "organizationClerkId",
        organizationContext.organizationClerkId
      );
      url.searchParams.set("simulateContext", "true");
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load capabilities: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to load capabilities");
    }

    return data.capabilities;
  }

  /**
   * Execute an MCP test operation
   */
  async runTest(request: McpTestRequest): Promise<McpTestResult> {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Test request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Test execution failed");
    }

    return data.testResult;
  }

  /**
   * Load test data (fixtures, scenarios, etc.)
   */
  async loadTestData(
    type: "fixtures" | "scenarios" | "mock-data" | "sample-requests",
    category?: string,
    organizationId?: string
  ): Promise<unknown> {
    const params = new URLSearchParams({
      type,
      ...(category && { category }),
      ...(organizationId && { organizationId }),
      count: "10",
    });

    const response = await fetch(`${this.baseUrl}/data?${params}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load test data: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to load test data");
    }

    return data.data;
  }

  /**
   * Run a tool test
   */
  async testTool(
    name: string,
    args: Record<string, unknown> = {},
    organizationContext?: McpTestRequest["organizationContext"]
  ): Promise<McpTestResult> {
    return this.runTest({
      operation: "tool",
      target: name,
      arguments: args,
      organizationContext,
      options: {
        timeout: 15000,
        validateResponse: true,
        includeMetadata: true,
      },
    });
  }

  /**
   * Run a prompt test
   */
  async testPrompt(
    name: string,
    organizationContext?: McpTestRequest["organizationContext"]
  ): Promise<McpTestResult> {
    return this.runTest({
      operation: "prompt",
      target: name,
      organizationContext,
      options: {
        timeout: 15000,
        validateResponse: true,
        includeMetadata: true,
      },
    });
  }

  /**
   * Run a resource test
   */
  async testResource(
    uri: string,
    organizationContext?: McpTestRequest["organizationContext"]
  ): Promise<McpTestResult> {
    return this.runTest({
      operation: "resource",
      target: uri,
      organizationContext,
      options: {
        timeout: 15000,
        validateResponse: true,
        includeMetadata: true,
      },
    });
  }

  /**
   * Run a health check test
   */
  async testHealth(
    target: string = "gateway",
    organizationContext?: McpTestRequest["organizationContext"]
  ): Promise<McpTestResult> {
    return this.runTest({
      operation: "health",
      target,
      organizationContext,
      options: {
        timeout: 10000,
        validateResponse: true,
        includeMetadata: true,
      },
    });
  }
}

// Export singleton instance
export const testingService = new TestingService();
