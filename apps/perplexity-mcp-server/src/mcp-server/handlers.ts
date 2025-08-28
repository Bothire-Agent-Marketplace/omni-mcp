import { perplexityServerConfig } from "../config/config.js";
import {
  PerplexityRequest,
  PerplexityResponse,
  PerplexityMessage,
  SearchResult,
} from "../types/domain-types.js";

async function callPerplexityAPI(
  request: PerplexityRequest
): Promise<PerplexityResponse> {
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
    throw new Error(
      `Perplexity API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  return response.json();
}

export async function handlePerplexitySearch(
  client: unknown,
  params: unknown
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const p = (params as Record<string, unknown>) || {};
  const query = String(p.query || "");
  const model = typeof p.model === "string" ? (p.model as string) : undefined;
  const max_tokens = Number.isFinite(p.max_tokens as number)
    ? (p.max_tokens as number)
    : undefined;
  const temperature = Number.isFinite(p.temperature as number)
    ? (p.temperature as number)
    : undefined;
  const search_recency_filter =
    p.search_recency_filter === "month" ||
    p.search_recency_filter === "week" ||
    p.search_recency_filter === "day" ||
    p.search_recency_filter === "hour"
      ? (p.search_recency_filter as "month" | "week" | "day" | "hour")
      : undefined;
  const return_images = p.return_images === true;
  const return_related_questions = p.return_related_questions === true;
  const search_domain_filter = Array.isArray(p.search_domain_filter)
    ? (p.search_domain_filter as string[])
    : undefined;

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
  const p = (params as Record<string, unknown>) || {};
  const topic = String(p.topic || "");
  const depth =
    p.depth === "basic" || p.depth === "detailed" || p.depth === "comprehensive"
      ? (p.depth as string)
      : "basic";
  const focus_areas = Array.isArray(p.focus_areas)
    ? (p.focus_areas as string[])
    : undefined;
  const exclude_domains = Array.isArray(p.exclude_domains)
    ? (p.exclude_domains as string[])
    : undefined;
  const recency =
    p.recency === "month" ||
    p.recency === "week" ||
    p.recency === "day" ||
    p.recency === "hour"
      ? (p.recency as string)
      : "month";

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
  const p = (params as Record<string, unknown>) || {};
  const items = Array.isArray(p.items) ? (p.items as string[]) : [];
  const criteria = Array.isArray(p.criteria)
    ? (p.criteria as string[])
    : undefined;
  const format =
    p.format === "table" || p.format === "prose" || p.format === "list"
      ? (p.format as string)
      : "prose";

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
  const p = (params as Record<string, unknown>) || {};
  const content = String(p.content || "");
  const length =
    p.length === "brief" || p.length === "medium" || p.length === "detailed"
      ? (p.length as "brief" | "medium" | "detailed")
      : ("medium" as const);
  const format =
    p.format === "bullets" ||
    p.format === "paragraphs" ||
    p.format === "outline"
      ? (p.format as "bullets" | "paragraphs" | "outline")
      : ("paragraphs" as const);

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
