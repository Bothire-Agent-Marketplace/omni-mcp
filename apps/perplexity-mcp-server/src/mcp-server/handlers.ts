// ============================================================================
// PERPLEXITY MCP SERVER - API Client
// ============================================================================

import { perplexityServerConfig } from "../config/config.js";
import { logger } from "../index.js";
import {
  SearchInputSchema,
  ResearchInputSchema,
  CompareInputSchema,
  SummarizeInputSchema,
} from "../schemas/domain-schemas.js";
import {
  PerplexityRequest,
  PerplexityResponse,
  PerplexityMessage,
  SearchResult,
} from "../types/domain-types.js";

async function callPerplexityAPI(
  request: PerplexityRequest
): Promise<PerplexityResponse> {
  logger.debug("Perplexity API request", {
    model: request.model,
    maxTokens: request.max_tokens,
    temperature: request.temperature,
    apiKeyPrefix: perplexityServerConfig.perplexityApiKey?.substring(0, 10),
  });

  const response = await fetch(
    `${perplexityServerConfig.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityServerConfig.perplexityApiKey}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(
      `Perplexity API error: ${response.status} ${response.statusText}`,
      undefined,
      { errorBody }
    );
    throw new Error(
      `Perplexity API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// ============================================================================
// TOOL HANDLERS - Following Linear server pattern
// ============================================================================

export async function handlePerplexitySearch(
  client: unknown,
  params: unknown
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  // Validate and parse input with Zod
  const validatedParams = SearchInputSchema.parse(params);
  const {
    query,
    model,
    max_tokens,
    temperature,
    search_recency_filter,
    return_images,
    return_related_questions,
    search_domain_filter,
  } = validatedParams;

  logger.debug("Perplexity search handler called", {
    query: query.substring(0, 50) + "...",
    model,
    maxTokens: max_tokens,
  });

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful AI assistant. Provide accurate, well-sourced answers with proper citations.",
    },
    {
      role: "user",
      content: query,
    },
  ];

  const request: PerplexityRequest = {
    model: model || perplexityServerConfig.defaultModel,
    messages,
    max_tokens: max_tokens || 1000,
    temperature: temperature || 0.2,
    search_recency_filter: search_recency_filter,
    return_images: return_images || false,
    return_related_questions: return_related_questions || false,
    search_domain_filter: search_domain_filter,
  };

  const response = await callPerplexityAPI(request);

  const result: SearchResult = {
    id: response.id,
    query: query,
    answer: response.choices[0].message.content,
    sources: extractSources(response.choices[0].message.content),
    timestamp: new Date().toISOString(),
    model: response.model,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

export async function handlePerplexityResearch(
  client: unknown,
  params: unknown
) {
  // Validate and parse input with Zod
  const validatedParams = ResearchInputSchema.parse(params);
  const { topic, depth, focus_areas, exclude_domains, recency } =
    validatedParams;

  const queries = generateResearchQueries(topic, depth, focus_areas);
  const results: SearchResult[] = [];

  for (const query of queries) {
    const searchParams = {
      query,
      search_recency_filter: recency,
      search_domain_filter: exclude_domains,
    };
    const response = await handlePerplexitySearch(client, searchParams);
    results.push(JSON.parse(response.content[0].text));
  }

  const report = await synthesizeResults(results, topic);

  return {
    content: [
      {
        type: "text" as const,
        text: report,
      },
    ],
  };
}

export async function handlePerplexityCompare(
  client: unknown,
  params: unknown
) {
  // Validate and parse input with Zod
  const validatedParams = CompareInputSchema.parse(params);
  const { items, criteria, format } = validatedParams;

  const comparisonQuery = buildComparisonQuery(items, criteria, format);
  const result = await handlePerplexitySearch(client, {
    query: comparisonQuery,
    model: "sonar-pro",
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.parse(result.content[0].text).answer,
      },
    ],
  };
}

export async function handlePerplexitySummarize(
  client: unknown,
  params: unknown
) {
  // Validate and parse input with Zod
  const validatedParams = SummarizeInputSchema.parse(params);
  const { content, length, format } = validatedParams;

  const summaryPrompt = buildSummaryPrompt(content, length, format);
  const result = await handlePerplexitySearch(client, {
    query: summaryPrompt,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.parse(result.content[0].text).answer,
      },
    ],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractSources(content: string): string[] {
  const urlRegex = /\[\d+\]:\s*([^\s]+)/g;
  const sources: string[] = [];
  let match;

  while ((match = urlRegex.exec(content)) !== null) {
    sources.push(match[1]);
  }

  return sources;
}

function generateResearchQueries(
  topic: string,
  depth: string,
  focusAreas?: string[]
): string[] {
  const baseQueries = [
    `What is ${topic}? Provide a comprehensive overview.`,
    `Latest developments and trends in ${topic}`,
    `Key challenges and opportunities in ${topic}`,
  ];

  if (depth === "detailed" || depth === "comprehensive") {
    baseQueries.push(
      `${topic} best practices and methodologies`,
      `${topic} case studies and real-world examples`
    );
  }

  if (depth === "comprehensive") {
    baseQueries.push(
      `Future outlook and predictions for ${topic}`,
      `${topic} industry analysis and market trends`
    );
  }

  if (focusAreas) {
    focusAreas.forEach((area) => {
      baseQueries.push(`${topic} ${area} analysis`);
    });
  }

  return baseQueries;
}

async function synthesizeResults(
  results: SearchResult[],
  topic: string
): Promise<string> {
  const synthesis = results.map((r) => r.answer).join("\n\n---\n\n");
  const synthesisQuery = `Based on the following research findings about "${topic}", create a comprehensive, well-organized report:\n\n${synthesis}`;

  const finalResult = await handlePerplexitySearch(null, {
    query: synthesisQuery,
    model: "sonar-pro",
    max_tokens: 4000,
  });

  return JSON.parse(finalResult.content[0].text).answer;
}

function buildComparisonQuery(
  items: string[],
  criteria?: string[],
  format?: string
): string {
  const itemsList = items.join(" vs ");
  const criteriaText = criteria ? ` focusing on ${criteria.join(", ")}` : "";
  const formatText =
    format === "table"
      ? " Present as a comparison table."
      : format === "list"
        ? " Present as a bulleted list."
        : "";

  return `Compare ${itemsList}${criteriaText}.${formatText}`;
}

function buildSummaryPrompt(
  content: string,
  length: "brief" | "medium" | "detailed",
  format: "bullets" | "paragraphs" | "outline"
): string {
  const lengthMap = {
    brief: "2-3 sentences",
    medium: "1-2 paragraphs",
    detailed: "3-4 paragraphs",
  };

  const formatMap = {
    bullets: "bullet points",
    paragraphs: "paragraphs",
    outline: "an outline format",
  };

  return `Summarize the following content in ${lengthMap[length]} using ${formatMap[format]}:\n\n${content}`;
}
