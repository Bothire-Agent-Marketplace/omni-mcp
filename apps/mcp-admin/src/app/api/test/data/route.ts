import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/test/data - Load test data (fixtures, scenarios, etc.)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "fixtures";
    const category = searchParams.get("category") || "all";
    const _organizationId = searchParams.get("organizationId");
    const count = parseInt(searchParams.get("count") || "10");

    // Generate test data based on type
    let data: unknown;

    switch (type) {
      case "fixtures":
        data = generateTestFixtures(category, count);
        break;
      case "scenarios":
        data = generateTestScenarios(category, count);
        break;
      case "mock-data":
        data = generateMockData(category, count);
        break;
      case "sample-requests":
        data = generateSampleRequests(category, count);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown test data type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error loading test data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load test data" },
      { status: 500 }
    );
  }
}

function generateTestFixtures(category: string, _count: number) {
  const fixtures: Record<string, unknown[]> = {};

  if (category === "all" || category === "tools") {
    fixtures.tools = [
      // Perplexity AI Tools
      {
        name: "perplexity_search",
        description: "Search using Perplexity AI",
        validArgs: {
          query: "What is the weather like today?",
          model: "sonar-pro",
        },
      },
      {
        name: "perplexity_research",
        description: "Research a topic comprehensively",
        validArgs: {
          topic: "Model Context Protocol architecture",
          depth: "detailed",
        },
      },
      {
        name: "perplexity_compare",
        description: "Compare multiple items",
        validArgs: {
          items: ["React", "Vue.js"],
          criteria: ["Performance", "Learning curve"],
          context: "Frontend frameworks",
        },
      },

      // Linear Tools
      {
        name: "linear_search_issues",
        description: "Search Linear issues",
        validArgs: {
          query: "bug report",
          limit: 5,
        },
      },
      {
        name: "linear_get_teams",
        description: "Get Linear teams",
        validArgs: {
          limit: 10,
        },
      },
      {
        name: "linear_get_issue",
        description: "Get specific Linear issue",
        validArgs: {
          issueId: "OMN-123",
        },
      },

      // Chrome Tools
      {
        name: "chrome_navigate",
        description: "Navigate Chrome to URL",
        validArgs: {
          url: "https://example.com",
          waitForLoad: true,
        },
      },
      {
        name: "chrome_status",
        description: "Get Chrome status",
        validArgs: {
          includeTabs: true,
        },
      },
      {
        name: "console_execute",
        description: "Execute JavaScript in browser",
        validArgs: {
          code: "document.title",
          awaitPromise: false,
        },
      },
      {
        name: "network_requests",
        description: "Get network requests",
        validArgs: {
          limit: 20,
          filter: "all",
        },
      },
    ];
  }

  if (category === "all" || category === "prompts") {
    fixtures.prompts = [
      {
        name: "code_review",
        description: "Code review prompt template",
        template: "Please review this code: {{code}}",
      },
      {
        name: "bug_analysis",
        description: "Bug analysis prompt",
        template: "Analyze this bug report: {{description}}",
      },
      {
        name: "feature_planning",
        description: "Feature planning prompt",
        template: "Plan implementation for: {{feature}}",
      },
    ];
  }

  if (category === "all" || category === "resources") {
    fixtures.resources = [
      {
        name: "API Documentation",
        uri: "https://jsonplaceholder.typicode.com/posts/1",
        description: "Sample JSON API endpoint",
      },
      {
        name: "Test Image",
        uri: "https://httpbin.org/image/png",
        description: "Sample PNG image resource",
      },
      {
        name: "Configuration File",
        uri: "file:///etc/config.json",
        description: "Sample local configuration file",
      },
    ];
  }

  return fixtures;
}

function generateTestScenarios(category: string, count: number) {
  const scenarios = [
    {
      name: "Basic Tool Testing",
      description: "Test simple tool calls with valid arguments",
      steps: [
        {
          action: "call_tool",
          tool: "perplexity_search",
          args: { query: "test" },
        },
        { action: "verify_response", expectSuccess: true },
      ],
      complexity: "simple",
    },
    {
      name: "Error Handling",
      description: "Test error scenarios and edge cases",
      steps: [
        { action: "call_tool", tool: "invalid_tool", args: {} },
        { action: "verify_response", expectSuccess: false },
      ],
      complexity: "moderate",
    },
    {
      name: "Complex Workflow",
      description: "Multi-step workflow with dependencies",
      steps: [
        {
          action: "call_tool",
          tool: "linear_search_issues",
          args: { query: "bug" },
        },
        { action: "use_result", in: "next_step" },
        {
          action: "call_tool",
          tool: "perplexity_search",
          args: { query: "{{previous_result}}" },
        },
      ],
      complexity: "complex",
    },
  ];

  return scenarios.slice(0, count);
}

function generateMockData(_category: string, _count: number) {
  const mockData: Record<string, unknown> = {};

  mockData.users = [
    { id: 1, name: "Test User 1", email: "test1@example.com" },
    { id: 2, name: "Test User 2", email: "test2@example.com" },
  ];

  mockData.organizations = [
    { id: 1, name: "Test Org 1", plan: "pro" },
    { id: 2, name: "Test Org 2", plan: "enterprise" },
  ];

  mockData.apiResponses = {
    success: { status: 200, message: "Success", data: {} },
    error: { status: 500, message: "Internal Server Error" },
    notFound: { status: 404, message: "Not Found" },
  };

  return mockData;
}

function generateSampleRequests(category: string, count: number) {
  // If requesting defaults, provide better default parameters for forms
  if (category === "defaults") {
    return [
      {
        operation: "tool",
        target: "perplexity_search",
        arguments: {
          query: "What is MCP (Model Context Protocol)?",
          model: "sonar-pro",
        },
      },
      {
        operation: "prompt",
        target: "code_review",
        arguments: {
          code: "const greeting = 'Hello, MCP!';\nconsole.log(greeting);",
        },
      },
      {
        operation: "resource",
        target: "https://jsonplaceholder.typicode.com/posts/1",
      },
      {
        operation: "health",
        target: "gateway",
      },
    ];
  }

  // Regular sample requests for documentation/examples
  return [
    {
      name: "Tool Call Request",
      method: "POST",
      path: "/api/test/mcp",
      body: {
        operation: "tool",
        target: "perplexity_search",
        arguments: {
          query: "What are the latest developments in AI?",
          model: "sonar-pro",
        },
      },
    },
    {
      name: "Prompt Request",
      method: "POST",
      path: "/api/test/mcp",
      body: {
        operation: "prompt",
        target: "code_review",
        arguments: {
          code: "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}",
        },
      },
    },
    {
      name: "Resource Request",
      method: "POST",
      path: "/api/test/mcp",
      body: {
        operation: "resource",
        target: "https://jsonplaceholder.typicode.com/posts/1",
      },
    },
    {
      name: "Health Check Request",
      method: "POST",
      path: "/api/test/mcp",
      body: {
        operation: "health",
        target: "gateway",
      },
    },
  ].slice(0, count);
}
