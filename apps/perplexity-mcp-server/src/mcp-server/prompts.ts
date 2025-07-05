// ============================================================================
// PERPLEXITY MCP SERVER - Prompts
// ============================================================================

import {
  createGenericPromptHandlers,
  getGenericAvailablePrompts,
  PromptDefinition,
} from "@mcp/utils";

// Prompt implementation functions
function perplexityWorkflowPrompt(args: unknown = {}) {
  // TODO: Add Zod validation for args if needed
  const { task } = args as { task?: string };

  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Please help me with this perplexity task: ${task || "general workflow"}`,
        },
      },
    ],
  };
}

function perplexityAutomationPrompt(args: unknown = {}) {
  // TODO: Add Zod validation for args if needed
  const { action } = args as { action?: string };

  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Please automate this perplexity action: ${action || "general automation"}`,
        },
      },
    ],
  };
}

// ============================================================================
// PERPLEXITY MCP SERVER - Prompt Definitions
// ============================================================================

const perplexityPromptDefinitions: Record<string, PromptDefinition> = {
  perplexity_workflow: {
    handler: async (args) => perplexityWorkflowPrompt(args),
    metadata: {
      name: "perplexity_workflow",
      description: "Standard perplexity workflow prompt",
    },
  },
  perplexity_automation: {
    handler: async (args) => perplexityAutomationPrompt(args),
    metadata: {
      name: "perplexity_automation",
      description: "Automation prompt for perplexity",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createPromptHandlers = () =>
  createGenericPromptHandlers(perplexityPromptDefinitions);

export const getAvailablePrompts = () =>
  getGenericAvailablePrompts(perplexityPromptDefinitions);
