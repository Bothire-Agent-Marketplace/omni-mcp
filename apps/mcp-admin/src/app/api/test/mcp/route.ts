import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/test/mcp - Load MCP capabilities
export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gatewayUrl = process.env.MCP_GATEWAY_URL || "http://localhost:37373";
    const apiKey = process.env.MCP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "MCP API key not configured" },
        { status: 500 }
      );
    }

    // Get JWT token from Clerk for proper authentication
    const jwtToken = await getToken();
    if (!jwtToken) {
      return NextResponse.json(
        { success: false, error: "Failed to get authentication token" },
        { status: 401 }
      );
    }

    // Extract organization context from query params for simulation mode
    const organizationClerkId = request.nextUrl.searchParams.get(
      "organizationClerkId"
    );
    const simulateContext =
      request.nextUrl.searchParams.get("simulateContext") === "true";

    // Prepare headers for gateway authentication
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
      "x-api-key": apiKey,
      "x-client-type": "mcp-admin-testing",
    };

    // Add organization context headers for simulation
    if (simulateContext && organizationClerkId) {
      headers["x-simulate-organization"] = organizationClerkId;
    }

    // Call gateway directly with JSON-RPC
    const [toolsResponse, promptsResponse, resourcesResponse] =
      await Promise.all([
        fetch(`${gatewayUrl}/mcp`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: `tools_${Date.now()}`,
            method: "tools/list",
            params: {},
          }),
        }),
        fetch(`${gatewayUrl}/mcp`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: `prompts_${Date.now()}`,
            method: "prompts/list",
            params: {},
          }),
        }),
        fetch(`${gatewayUrl}/mcp`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: `resources_${Date.now()}`,
            method: "resources/list",
            params: {},
          }),
        }),
      ]);

    const [tools, prompts, resources] = await Promise.all([
      toolsResponse.ok ? toolsResponse.json() : { result: { tools: [] } },
      promptsResponse.ok ? promptsResponse.json() : { result: { prompts: [] } },
      resourcesResponse.ok
        ? resourcesResponse.json()
        : { result: { resources: [] } },
    ]);

    const capabilities = {
      operations: ["tool", "prompt", "resource", "health"],
      tools: tools.result?.tools || [],
      prompts: prompts.result?.prompts || [],
      resources: resources.result?.resources || [],
      healthTargets: ["gateway", "linear", "perplexity", "devtools"],
    };

    return NextResponse.json({ success: true, capabilities });
  } catch (error) {
    console.error("Error loading MCP capabilities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load MCP capabilities" },
      { status: 500 }
    );
  }
}

// POST /api/test/mcp - Run MCP test
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      operation,
      target,
      arguments: args = {},
      organizationContext,
      options,
    } = body;

    if (!operation || !target) {
      return NextResponse.json(
        { success: false, error: "Operation and target are required" },
        { status: 400 }
      );
    }

    const gatewayUrl = process.env.MCP_GATEWAY_URL || "http://localhost:37373";
    const apiKey = process.env.MCP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "MCP API key not configured" },
        { status: 500 }
      );
    }

    // Get JWT token from Clerk for proper authentication
    const jwtToken = await getToken();
    if (!jwtToken) {
      return NextResponse.json(
        { success: false, error: "Failed to get authentication token" },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    let method: string;
    let params: Record<string, unknown>;

    // Map operations to MCP methods
    switch (operation) {
      case "tool":
        method = "tools/call";
        params = {
          name: target,
          arguments: args,
        };
        break;
      case "prompt":
        method = "prompts/get";
        params = {
          name: target,
          arguments: args,
        };
        break;
      case "resource":
        method = "resources/read";
        params = {
          uri: target,
        };
        break;
      case "health":
        // Health check - just ping the gateway
        method = "tools/list";
        params = {};
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    try {
      // Prepare headers for gateway authentication
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
        "x-api-key": apiKey,
        "x-client-type": "mcp-admin-testing",
      };

      // Add organization context simulation headers if needed
      if (
        organizationContext?.simulate &&
        organizationContext?.organizationClerkId
      ) {
        headers["x-simulate-organization"] =
          organizationContext.organizationClerkId;
      }

      const response = await fetch(`${gatewayUrl}/mcp`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `test_${Date.now()}`,
          method,
          params,
        }),
        signal: AbortSignal.timeout(options?.timeout || 15000),
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      const testResult = {
        success: !result.error,
        operation,
        target,
        responseTime,
        timestamp: new Date().toISOString(),
        result: result.result,
        error: result.error?.message || result.error,
        metadata: {
          organizationContext,
          gatewayUrl,
          serverHealth: response.ok,
        },
      };

      return NextResponse.json({ success: true, testResult });
    } catch (fetchError) {
      const responseTime = Date.now() - startTime;
      const error =
        fetchError instanceof Error ? fetchError.message : "Unknown error";

      const testResult = {
        success: false,
        operation,
        target,
        responseTime,
        timestamp: new Date().toISOString(),
        result: null,
        error,
        metadata: {
          organizationContext,
          gatewayUrl,
          serverHealth: false,
        },
      };

      return NextResponse.json({ success: true, testResult });
    }
  } catch (error) {
    console.error("Error running MCP test:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run MCP test" },
      { status: 500 }
    );
  }
}
