import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { loadEnvironment } from "@mcp/utils";

// Load environment variables using the centralized system
loadEnvironment(__dirname);

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: object;
}

interface MCPToolsResponse {
  result?: {
    tools?: MCPTool[];
  };
}

interface ToolExecuteResponse {
  result?: {
    content?: Array<{
      text: string;
    }>;
  };
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      provider = "openai",
      model = "gpt-4o",
      enableTools = true,
    } = await req.json();

    // Get environment variables that were loaded by env-loader
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const gatewayUrl = process.env.MCP_GATEWAY_URL || "http://localhost:37373";

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "OpenAI API key not found. Please check your environment configuration.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `🤖 Chat API: Using ${provider} ${model}, Gateway: ${gatewayUrl}`
    );

    const tools: Record<
      string,
      {
        description: string;
        parameters: object;
        execute: (params: Record<string, unknown>) => Promise<string>;
      }
    > = {};

    // Connect to MCP gateway to get tools if enabled
    if (enableTools) {
      try {
        console.log(`🔧 Connecting to MCP gateway at ${gatewayUrl}`);

        // Fetch available tools from your gateway
        const toolsResponse = await fetch(`${gatewayUrl}/tools/list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.MCP_API_KEY && {
              Authorization: `Bearer ${process.env.MCP_API_KEY}`,
            }),
          },
          body: JSON.stringify({
            method: "tools/list",
            params: {},
          }),
        });

        if (toolsResponse.ok) {
          const toolsData: MCPToolsResponse = await toolsResponse.json();
          console.log(
            `🔧 Loaded ${toolsData.result?.tools?.length || 0} MCP tools`
          );

          // Convert MCP tools to AI SDK format
          if (toolsData.result?.tools) {
            for (const tool of toolsData.result.tools) {
              tools[tool.name] = {
                description: tool.description,
                parameters: tool.inputSchema || {},
                execute: async (params: Record<string, unknown>) => {
                  // Call the MCP gateway to execute the tool
                  const executeResponse = await fetch(
                    `${gatewayUrl}/tools/call`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(process.env.MCP_API_KEY && {
                          Authorization: `Bearer ${process.env.MCP_API_KEY}`,
                        }),
                      },
                      body: JSON.stringify({
                        method: "tools/call",
                        params: {
                          name: tool.name,
                          arguments: params,
                        },
                      }),
                    }
                  );

                  const result: ToolExecuteResponse =
                    await executeResponse.json();
                  return (
                    result.result?.content?.[0]?.text || JSON.stringify(result)
                  );
                },
              };
            }
          }
        } else {
          console.warn(
            `⚠️ Failed to connect to MCP gateway: ${toolsResponse.status}`
          );
        }
      } catch (error) {
        console.warn("⚠️ MCP gateway connection failed:", error);
      }
    }

    // Generate streaming response with MCP tools
    const result = await streamText({
      model: openai(model),
      messages,
      tools: enableTools ? tools : undefined,
      maxSteps: 5,
      system: `You are a helpful AI assistant integrated with the Omni MCP (Model Context Protocol) system. 
               You have access to powerful tools through the MCP gateway at ${gatewayUrl}.
               
               Available capabilities:
               - Linear: Issue management, team coordination, project tracking
               - Perplexity: Web search, research automation, real-time information  
               - DevTools: Browser automation, debugging, screenshots, web interaction
               
               ${enableTools ? `Tools are active and ready to use. You can help users with Linear tasks, web research, and browser automation.` : "Text-only mode is active."}
               
               When using tools, be descriptive about what you're doing and explain the results clearly.`,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// GET endpoint to return available information
export async function GET() {
  try {
    const gatewayUrl = process.env.MCP_GATEWAY_URL || "http://localhost:37373";

    // Try to get tools from the gateway
    let toolsInfo = {
      available: 0,
      categories: {
        linear: 0,
        perplexity: 0,
        devtools: 0,
      },
      status: "Checking MCP gateway connection...",
    };

    try {
      const toolsResponse = await fetch(`${gatewayUrl}/tools/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.MCP_API_KEY && {
            Authorization: `Bearer ${process.env.MCP_API_KEY}`,
          }),
        },
        body: JSON.stringify({
          method: "tools/list",
          params: {},
        }),
      });

      if (toolsResponse.ok) {
        const toolsData: MCPToolsResponse = await toolsResponse.json();
        const tools = toolsData.result?.tools || [];

        toolsInfo = {
          available: tools.length,
          categories: {
            linear: tools.filter((t: MCPTool) => t.name.includes("linear"))
              .length,
            perplexity: tools.filter((t: MCPTool) =>
              t.name.includes("perplexity")
            ).length,
            devtools: tools.filter(
              (t: MCPTool) =>
                t.name.includes("chrome") || t.name.includes("browser")
            ).length,
          },
          status: `Connected to MCP gateway - ${tools.length} tools available`,
        };
      } else {
        toolsInfo.status = `Failed to connect to MCP gateway (${toolsResponse.status})`;
      }
    } catch (error) {
      toolsInfo.status = `MCP gateway connection error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }

    return new Response(
      JSON.stringify({
        providers: {
          openai: {
            available: true,
            models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
          },
        },
        defaultProvider: "openai",
        defaultModel: "gpt-4o",
        tools: toolsInfo,
        gateway: {
          url: gatewayUrl,
          connected: toolsInfo.available > 0,
        },
        environmentVariables: {
          openai: process.env.OPENAI_API_KEY
            ? "OPENAI_API_KEY ✓"
            : "OPENAI_API_KEY ✗",
          gateway: process.env.MCP_GATEWAY_URL
            ? "MCP_GATEWAY_URL ✓"
            : "MCP_GATEWAY_URL ✗",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("GET API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve API information",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
