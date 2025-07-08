import { z } from "zod";

// ============================================================================
// AI PROVIDER TYPES AND SCHEMAS
// ============================================================================

// Provider enum
export const AIProviderEnum = z.enum([
  "qwen",
  "ollama",
  "google",
  "openai",
  "anthropic",
]);

export type AIProvider = z.infer<typeof AIProviderEnum>;

// Model definitions for each provider
export const QwenModels = z.enum([
  "qwen2.5-14b-instruct",
  "qwen2.5-8b-instruct",
  "qwen2.5-72b-instruct",
  "qwen2.5-7b-instruct",
]);

export const OllamaModels = z.enum(["qwen2.5-coder-7b"]);

export const GoogleModels = z.enum([
  "gemini-2.5-ultra",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);

export const OpenAIModels = z.enum([
  "gpt-4.5",
  "gpt-4.5-turbo",
  "gpt-4.5-flash",
  "gpt-3.5-turbo",
]);

export const AnthropicModels = z.enum([
  "claude-4-opus",
  "claude-4-sonnet",
  "claude-4-haiku",
]);

// Union of all models
export const AIModelEnum = z.union([
  QwenModels,
  OllamaModels,
  GoogleModels,
  OpenAIModels,
  AnthropicModels,
]);

export type AIModel = z.infer<typeof AIModelEnum>;

// Provider configuration type
export const AIProviderConfigSchema = z.object({
  name: AIProviderEnum,
  models: z.array(z.string()),
  isLocal: z.boolean(),
  description: z.string(),
  requiresApiKey: z.string(),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

// Chat request schema
export const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  provider: AIProviderEnum.default("ollama"),
  model: z.string().default("qwen2.5-coder-7b"),
  enableTools: z.boolean().default(false),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// MCP Tool category enum
export const MCPToolCategoryEnum = z.enum(["linear", "perplexity", "devtools"]);

export type MCPToolCategory = z.infer<typeof MCPToolCategoryEnum>;

// MCP Tool schema
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: MCPToolCategoryEnum,
  inputSchema: z.record(z.any()),
});

export type MCPTool = z.infer<typeof MCPToolSchema>;

// Tools response schema
export const ToolsResponseSchema = z.object({
  available: z.number(),
  categories: z.object({
    linear: z.number(),
    perplexity: z.number(),
    devtools: z.number(),
  }),
  list: z.array(MCPToolSchema),
});

export type ToolsResponse = z.infer<typeof ToolsResponseSchema>;

// API response schema
export const APIResponseSchema = z.object({
  providers: z.array(AIProviderConfigSchema),
  defaultProvider: AIProviderEnum,
  defaultModel: z.string(),
  tools: ToolsResponseSchema,
  environmentVariables: z.record(z.string()),
});

export type APIResponse = z.infer<typeof APIResponseSchema>;

// AI Error response schema
export const AIErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  suggestion: z.string().optional(),
  availableModels: z.array(z.string()).optional(),
});

export type AIErrorResponse = z.infer<typeof AIErrorResponseSchema>;

// Environment variable requirements
export const ENV_REQUIREMENTS = {
  qwen: "DASHSCOPE_API_KEY",
  ollama: "None (local)",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
} as const;

// Provider descriptions
export const PROVIDER_DESCRIPTIONS = {
  qwen: "Qwen 3 Cloud - Advanced reasoning, tool calling, multilingual",
  ollama: "Local Qwen - Free, private, fast (via Ollama)",
  google: "Google Gemini - Advanced multimodal AI",
  openai: "OpenAI GPT - Industry leading models",
  anthropic: "Anthropic Claude - Excellent reasoning",
} as const;

// Model mappings (internal model IDs)
export const MODEL_MAPPINGS = {
  qwen: {
    "qwen2.5-14b-instruct": "qwen2.5-14b-instruct-1m",
    "qwen2.5-8b-instruct": "qwen2.5-8b-instruct-1m",
    "qwen2.5-72b-instruct": "qwen2.5-72b-instruct",
    "qwen2.5-7b-instruct": "qwen2.5-7b-instruct",
  },
  ollama: {
    "qwen2.5-coder-7b": "qwen2.5-coder:7b",
  },
  google: {
    "gemini-2.5-ultra": "gemini-2.5-ultra-latest",
    "gemini-2.5-pro": "gemini-2.5-pro-latest",
    "gemini-2.5-flash": "gemini-2.5-flash-latest",
    "gemini-2.5-flash-lite": "gemini-2.5-flash-lite-latest",
  },
  openai: {
    "gpt-4.5": "gpt-4.5",
    "gpt-4.5-turbo": "gpt-4.5-turbo",
    "gpt-4.5-flash": "gpt-4.5-flash",
    "gpt-3.5-turbo": "gpt-3.5-turbo",
  },
  anthropic: {
    "claude-4-opus": "claude-4-opus-202505",
    "claude-4-sonnet": "claude-4-sonnet-202505",
    "claude-4-haiku": "claude-4-haiku-202505",
  },
} as const;
