// ============================================================================
// PERPLEXITY MCP SERVER - Resources
// ============================================================================

import {
  createGenericResourceHandlers,
  getGenericAvailableResources,
  ResourceDefinition,
} from "@mcp/utils";

// ============================================================================
// RESOURCE HANDLERS
// ============================================================================

async function handleSearchHistory(_client: unknown, uri: string) {
  // TODO: Implement search history retrieval from a database or cache
  // const { query } = params;
  return {
    contents: [
      {
        uri: uri,
        mimeType: "application/json",
        text: JSON.stringify([], null, 2),
      },
    ],
  };
}

async function handleAvailableModels(_client: unknown, uri: string) {
  const models = [
    {
      name: "sonar",
      description: "Lightweight, cost-effective search model with grounding",
      contextWindow: 127000,
      pricing: { search: 5, input: 1, output: 1 },
    },
    {
      name: "sonar-pro",
      description: "Premier search offering with search grounding",
      contextWindow: 200000,
      pricing: { search: 5, input: 3, output: 15 },
    },
    {
      name: "sonar-reasoning-pro",
      description: "Premier reasoning offering powered by DeepSeek R1",
      contextWindow: 200000,
      pricing: { search: 5, input: 3, output: 15 },
    },
  ];
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(models, null, 2),
      },
    ],
  };
}

// ============================================================================
// PERPLEXITY MCP SERVER - Resource Definitions
// ============================================================================

const perplexityResourceDefinitions: Record<
  string,
  ResourceDefinition<unknown>
> = {
  "perplexity://search-history": {
    handler: handleSearchHistory,
    metadata: {
      uri: "perplexity://search-history",
      name: "perplexity-search-history",
      description: "Access previous Perplexity search results",
      mimeType: "application/json",
    },
  },
  "perplexity://models": {
    handler: handleAvailableModels,
    metadata: {
      uri: "perplexity://models",
      name: "perplexity-models",
      description: "List of available Perplexity models and their capabilities",
      mimeType: "application/json",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createResourceHandlers = () =>
  createGenericResourceHandlers(perplexityResourceDefinitions, {});

export const getAvailableResources = () =>
  getGenericAvailableResources(perplexityResourceDefinitions);
