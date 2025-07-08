import {
  AIProvider,
  AIProviderConfig,
  MCPToolCategory,
  ENV_REQUIREMENTS,
  PROVIDER_DESCRIPTIONS,
  MODEL_MAPPINGS,
} from "@mcp/schemas";

// ============================================================================
// AI PROVIDER HELPER FUNCTIONS
// ============================================================================

// MCP Gateway Configuration
const MCP_GATEWAY_URL = process.env.MCP_GATEWAY_URL || "http://localhost:37373";

// Basic MCP tool interface for internal use
interface MCPToolResponse {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// MCP JSON-RPC response interface
interface MCPResponse {
  jsonrpc: string;
  id: string;
  result?: {
    tools?: MCPToolResponse[];
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * List available tools from MCP Gateway
 */
export async function listMCPTools(): Promise<MCPToolResponse[]> {
  try {
    const response = await fetch(`${MCP_GATEWAY_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "tools_list",
        method: "tools/list",
        params: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP Gateway error: ${response.status}`);
    }

    const result: MCPResponse = await response.json();
    return result.result?.tools || [];
  } catch (error) {
    console.error("Failed to list MCP tools:", error);
    return [];
  }
}

/**
 * Call an MCP tool with parameters
 */
export async function callMCPTool(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  try {
    const response = await fetch(`${MCP_GATEWAY_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `tool_call_${Date.now()}`,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: parameters,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP Gateway error: ${response.status}`);
    }

    const result: MCPResponse = await response.json();

    if (result.error) {
      throw new Error(`MCP Tool error: ${result.error.message}`);
    }

    return result.result;
  } catch (error) {
    console.error(`Failed to call MCP tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Get provider description
 */
export function getProviderDescription(provider: AIProvider): string {
  return PROVIDER_DESCRIPTIONS[provider] || "AI Provider";
}

/**
 * Get API key requirement for provider
 */
export function getApiKeyRequirement(provider: AIProvider): string {
  return ENV_REQUIREMENTS[provider] || "Unknown";
}

/**
 * Get internal model ID for provider and model
 */
export function getModelId(
  provider: AIProvider,
  model: string
): string | undefined {
  const providerModels = MODEL_MAPPINGS[provider];
  if (!providerModels) return undefined;

  return (providerModels as Record<string, string>)[model];
}

/**
 * Get available models for a provider
 */
export function getProviderModels(provider: AIProvider): string[] {
  const providerModels = MODEL_MAPPINGS[provider];
  if (!providerModels) return [];

  return Object.keys(providerModels);
}

/**
 * Categorize MCP tool by name
 */
export function categorizeMCPTool(toolName: string): MCPToolCategory {
  if (toolName.startsWith("linear_")) return "linear";
  if (toolName.startsWith("perplexity_")) return "perplexity";
  return "devtools";
}

/**
 * Convert MCP tools to categorized format
 */
export function categorizeMCPTools(mcpTools: MCPToolResponse[]): {
  linear: MCPToolResponse[];
  perplexity: MCPToolResponse[];
  devtools: MCPToolResponse[];
} {
  return {
    linear: mcpTools.filter((tool: MCPToolResponse) =>
      tool.name.startsWith("linear_")
    ),
    perplexity: mcpTools.filter((tool: MCPToolResponse) =>
      tool.name.startsWith("perplexity_")
    ),
    devtools: mcpTools.filter(
      (tool: MCPToolResponse) =>
        tool.name.startsWith("chrome_") ||
        tool.name.startsWith("dom_") ||
        tool.name.startsWith("console_") ||
        tool.name.startsWith("network_") ||
        tool.name.includes("debug_") ||
        tool.name.includes("error_") ||
        tool.name.includes("css_") ||
        tool.name.includes("storage_") ||
        tool.name.includes("screenshot_")
    ),
  };
}

/**
 * Convert MCP tools to AI SDK format
 */
export function convertMCPToolsToAISDK(mcpTools: MCPToolResponse[]): Record<
  string,
  {
    description: string;
    parameters: Record<string, unknown>;
    execute: (params: Record<string, unknown>) => Promise<unknown>;
  }
> {
  return mcpTools.reduce(
    (acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (params: Record<string, unknown>) => {
          return await callMCPTool(tool.name, params);
        },
      };
      return acc;
    },
    {} as Record<
      string,
      {
        description: string;
        parameters: Record<string, unknown>;
        execute: (params: Record<string, unknown>) => Promise<unknown>;
      }
    >
  );
}

/**
 * Get AI provider configurations
 */
export function getAIProviderConfigs(): AIProviderConfig[] {
  const providers: AIProvider[] = [
    "qwen",
    "ollama",
    "google",
    "openai",
    "anthropic",
  ];

  return providers.map((provider) => ({
    name: provider,
    models: getProviderModels(provider),
    isLocal: provider === "ollama",
    description: getProviderDescription(provider),
    requiresApiKey: getApiKeyRequirement(provider),
  }));
}

/**
 * Validate environment variables for provider
 */
export function validateProviderEnvironment(provider: AIProvider): {
  isValid: boolean;
  error?: string;
} {
  switch (provider) {
    case "qwen":
      if (!process.env.DASHSCOPE_API_KEY) {
        return {
          isValid: false,
          error: "DASHSCOPE_API_KEY not configured for cloud Qwen models",
        };
      }
      break;
    case "google":
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return {
          isValid: false,
          error: "Google AI API key not configured",
        };
      }
      break;
    case "openai":
      if (!process.env.OPENAI_API_KEY) {
        return {
          isValid: false,
          error: "OpenAI API key not configured",
        };
      }
      break;
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          isValid: false,
          error: "Anthropic API key not configured",
        };
      }
      break;
    case "ollama":
      // Local models don't require API keys
      break;
    default:
      return {
        isValid: false,
        error: "Unknown provider",
      };
  }

  return { isValid: true };
}
