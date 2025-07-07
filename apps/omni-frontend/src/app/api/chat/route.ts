import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { qwen } from "qwen-ai-provider";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Define available AI providers with latest models from MODELS.md
const AI_PROVIDERS = {
  qwen: {
    provider: qwen,
    models: {
      // Qwen 3 models with proper IDs from documentation
      "qwen2.5-14b-instruct": "qwen2.5-14b-instruct-1m",
      "qwen2.5-8b-instruct": "qwen2.5-8b-instruct-1m",
      "qwen2.5-72b-instruct": "qwen2.5-72b-instruct",
      "qwen2.5-7b-instruct": "qwen2.5-7b-instruct",
      // Local Ollama models (if available)
      "qwen2.5-coder-7b": "qwen2.5-coder:7b",
    },
  },
  google: {
    provider: google,
    models: {
      "gemini-2.5-ultra": "gemini-2.5-ultra-latest",
      "gemini-2.5-pro": "gemini-2.5-pro-latest",
      "gemini-2.5-flash": "gemini-2.5-flash-latest",
      "gemini-2.5-flash-lite": "gemini-2.5-flash-lite-latest",
    },
  },
  openai: {
    provider: openai,
    models: {
      "gpt-4.5": "gpt-4.5",
      "gpt-4.5-turbo": "gpt-4.5-turbo",
      "gpt-4.5-flash": "gpt-4.5-flash",
      "gpt-3.5-turbo": "gpt-3.5-turbo",
    },
  },
  anthropic: {
    provider: anthropic,
    models: {
      "claude-4-opus": "claude-4-opus-202505",
      "claude-4-sonnet": "claude-4-sonnet-202505",
      "claude-4-haiku": "claude-4-haiku-202505",
    },
  },
} as const;

export async function POST(req: Request) {
  try {
    const {
      messages,
      provider = "qwen",
      model = "qwen2.5-14b-instruct",
    } = await req.json();

    // Validate provider and model
    if (!AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS]) {
      return new Response(
        JSON.stringify({ error: `Unsupported provider: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const selectedProvider =
      AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
    const modelId =
      selectedProvider.models[model as keyof typeof selectedProvider.models];

    if (!modelId) {
      return new Response(
        JSON.stringify({
          error: `Unsupported model: ${model} for provider: ${provider}`,
          availableModels: Object.keys(selectedProvider.models),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Configure the AI model
    let aiModel;

    switch (provider) {
      case "qwen": {
        // Check if DASHSCOPE_API_KEY is available for cloud Qwen models
        // Local Ollama models contain ':' in their ID (e.g., 'qwen2.5-coder:7b')
        const isLocalModel = String(modelId).includes(":");
        if (!process.env.DASHSCOPE_API_KEY && !isLocalModel) {
          return new Response(
            JSON.stringify({
              error: "DASHSCOPE_API_KEY not configured for cloud Qwen models",
              suggestion:
                "Set DASHSCOPE_API_KEY environment variable or use local Ollama models",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        aiModel = selectedProvider.provider(modelId);
        break;
      }

      case "google":
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          return new Response(
            JSON.stringify({ error: "Google AI API key not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        aiModel = selectedProvider.provider(modelId);
        break;

      case "openai":
        if (!process.env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ error: "OpenAI API key not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        aiModel = selectedProvider.provider(modelId);
        break;

      case "anthropic":
        if (!process.env.ANTHROPIC_API_KEY) {
          return new Response(
            JSON.stringify({ error: "Anthropic API key not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        aiModel = selectedProvider.provider(modelId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid provider configuration" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    // Generate streaming response
    const result = await streamText({
      model: aiModel,
      messages,
      system: `You are a helpful AI assistant integrated with the Omni MCP (Model Context Protocol) system. 
               You can help users interact with various MCP servers and tools.
               Current provider: ${provider}, Model: ${model}
               
               Available MCP capabilities:
               - Linear: Issue management, team coordination (5 tools)
               - Perplexity: Web search, research automation (4 tools)  
               - DevTools: Browser automation, debugging (40 tools)`,
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

// GET endpoint to return available providers and models
export async function GET() {
  const availableProviders = Object.entries(AI_PROVIDERS).map(
    ([key, config]) => ({
      name: key,
      models: Object.keys(config.models),
      isLocal: key === "qwen",
      description: getProviderDescription(key),
      requiresApiKey: getApiKeyRequirement(key),
    })
  );

  return new Response(
    JSON.stringify({
      providers: availableProviders,
      defaultProvider: "qwen",
      defaultModel: "qwen2.5-14b-instruct",
      environmentVariables: {
        qwen: "DASHSCOPE_API_KEY (for cloud models)",
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
}

function getProviderDescription(provider: string): string {
  switch (provider) {
    case "qwen":
      return "Qwen 3 - Advanced reasoning, tool calling, multilingual";
    case "google":
      return "Google Gemini - Advanced multimodal AI";
    case "openai":
      return "OpenAI GPT - Industry leading models";
    case "anthropic":
      return "Anthropic Claude - Excellent reasoning";
    default:
      return "AI Provider";
  }
}

function getApiKeyRequirement(provider: string): string {
  switch (provider) {
    case "qwen":
      return "DASHSCOPE_API_KEY (cloud) or local Ollama";
    case "google":
      return "GOOGLE_GENERATIVE_AI_API_KEY";
    case "openai":
      return "OPENAI_API_KEY";
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    default:
      return "Unknown";
  }
}
