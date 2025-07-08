import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { ollama } from "ollama-ai-provider";
import { qwen } from "qwen-ai-provider";
import { ChatRequestSchema, MODEL_MAPPINGS } from "@mcp/schemas";
import {
  listMCPTools,
  convertMCPToolsToAISDK,
  getAIProviderConfigs,
  categorizeMCPTools,
  validateProviderEnvironment,
  getModelId,
} from "@mcp/utils";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const requestBody = await req.json();

    // Validate request with schema
    const validatedRequest = ChatRequestSchema.parse(requestBody);
    const { messages, provider, model, enableTools } = validatedRequest;

    // Validate provider environment
    const envValidation = validateProviderEnvironment(provider);
    if (!envValidation.isValid) {
      return new Response(
        JSON.stringify({
          error: envValidation.error,
          suggestion:
            provider === "qwen"
              ? "Set DASHSCOPE_API_KEY environment variable or use local Ollama models"
              : `Configure the required API key for ${provider}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get model ID
    const modelId = getModelId(provider, model);
    if (!modelId) {
      const providerModels = MODEL_MAPPINGS[provider];
      return new Response(
        JSON.stringify({
          error: `Unsupported model: ${model} for provider: ${provider}`,
          availableModels: providerModels ? Object.keys(providerModels) : [],
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Configure the AI model
    let aiModel;
    switch (provider) {
      case "qwen":
        aiModel = qwen(modelId);
        break;
      case "ollama":
        aiModel = ollama(modelId);
        break;
      case "google":
        aiModel = google(modelId);
        break;
      case "openai":
        aiModel = openai(modelId);
        break;
      case "anthropic":
        aiModel = anthropic(modelId);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid provider configuration" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    // Prepare tools if enabled
    let tools = {};
    if (enableTools) {
      const mcpTools = await listMCPTools();
      tools = convertMCPToolsToAISDK(mcpTools);
    }

    // Generate streaming response
    const result = await streamText({
      model: aiModel,
      messages,
      tools: enableTools ? tools : undefined,
      system: `You are a helpful AI assistant integrated with the Omni MCP (Model Context Protocol) system. 
               You can help users interact with various MCP servers and tools.
               Current provider: ${provider}, Model: ${model}
               
               Available MCP capabilities:
               - Linear: Issue management, team coordination (5 tools)
               - Perplexity: Web search, research automation (4 tools)  
               - DevTools: Browser automation, debugging (40+ tools)
               
               ${enableTools ? "Tools are enabled - you can use them to help users with tasks." : "Tools are disabled - you can only provide information and guidance."}`,
      maxTokens: 1000,
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

// GET endpoint to return available providers, models, and tools
export async function GET() {
  try {
    const availableProviders = getAIProviderConfigs();

    // Get available MCP tools
    const mcpTools = await listMCPTools();
    const toolsByCategory = categorizeMCPTools(mcpTools);

    return new Response(
      JSON.stringify({
        providers: availableProviders,
        defaultProvider: "ollama",
        defaultModel: "qwen2.5-coder-7b",
        tools: {
          available: mcpTools.length,
          categories: {
            linear: toolsByCategory.linear.length,
            perplexity: toolsByCategory.perplexity.length,
            devtools: toolsByCategory.devtools.length,
          },
          list: mcpTools.map((tool: { name: string; description: string }) => ({
            name: tool.name,
            description: tool.description,
            category: tool.name.startsWith("linear_")
              ? "linear"
              : tool.name.startsWith("perplexity_")
                ? "perplexity"
                : "devtools",
          })),
        },
        environmentVariables: {
          qwen: "DASHSCOPE_API_KEY (for cloud models)",
          ollama: "None (local models)",
          google: "GOOGLE_GENERATIVE_AI_API_KEY",
          openai: "OPENAI_API_KEY",
          anthropic: "ANTHROPIC_API_KEY",
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
