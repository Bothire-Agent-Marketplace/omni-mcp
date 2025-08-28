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
    cached?: boolean;
    cacheAge?: number;
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
    bypassCache?: boolean;
  };
}

interface CacheEntry {
  key: string;
  result: McpTestResult;
  timestamp: number;
  ttl: number;
}

export class TestingService {
  private baseUrl: string;
  private sessionId: string | null = null;
  private lastSessionTime: number = 0;
  private SESSION_TIMEOUT = 30 * 60 * 1000;
  private cache = new Map<string, CacheEntry>();
  private CACHE_TTL = 60 * 60 * 1000;

  constructor() {
    this.baseUrl = "/api/test";

    this.sessionId = `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: McpTestRequest): string {
    const keyData = {
      operation: request.operation,
      target: request.target,
      arguments: request.arguments || {},
      organizationContext: request.organizationContext || {},
    };
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, "");
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private getCachedResult(request: McpTestRequest): McpTestResult | null {
    if (request.options?.bypassCache) {
      return null;
    }

    const cacheKey = this.generateCacheKey(request);
    const entry = this.cache.get(cacheKey);

    if (entry && this.isCacheValid(entry)) {
      const cachedResult = {
        ...entry.result,
        metadata: {
          ...entry.result.metadata,
          cached: true,
          cacheAge: Date.now() - entry.timestamp,
        },
      };

      console.log(`Cache hit for ${request.operation}:${request.target}`);
      return cachedResult;
    }

    if (entry && !this.isCacheValid(entry)) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private setCachedResult(
    request: McpTestRequest,
    result: McpTestResult
  ): void {
    const cacheKey = this.generateCacheKey(request);

    if (!result.success) {
      return;
    }

    let ttl = this.CACHE_TTL;
    if (request.operation === "tool" && request.target.includes("perplexity")) {
      ttl = 2 * 60 * 60 * 1000;
    }

    const entry: CacheEntry = {
      key: cacheKey,
      result: { ...result },
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(cacheKey, entry);
    console.log(
      `Cached result for ${request.operation}:${request.target} (TTL: ${ttl}ms)`
    );
  }

  clearCache(): void {
    this.cache.clear();
    console.log("Cache cleared");
  }

  getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
      operation: string;
      target: string;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl,
      operation: entry.result.operation,
      target: entry.result.target,
    }));

    return { size: this.cache.size, entries };
  }

  private getHeaders(): Record<string, string> {
    const now = Date.now();

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

  async loadCapabilities(organizationContext?: {
    organizationClerkId?: string;
    simulate?: boolean;
  }): Promise<McpTestCapabilities> {
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

  async runTest(request: McpTestRequest): Promise<McpTestResult> {
    const cachedResult = this.getCachedResult(request);
    if (cachedResult) {
      return cachedResult;
    }

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

    const result = data.testResult;

    this.setCachedResult(request, result);

    return result;
  }

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

export const testingService = new TestingService();
