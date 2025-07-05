// ============================================================================
// PERPLEXITY MCP SERVER - Domain Types
// ============================================================================

// Perplexity API Request/Response Types
export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
  response_format?: {
    type: "json_schema" | "regex";
    json_schema?: { schema: object };
    regex?: { regex: string };
  };
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: "month" | "week" | "day" | "hour";
}

export interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    finish_reason: string;
    index: number;
    message: {
      content: string;
      role: "assistant";
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Search Resource Types
export interface SearchResult {
  id: string;
  query: string;
  answer: string;
  sources: string[];
  timestamp: string;
  model: string;
}
