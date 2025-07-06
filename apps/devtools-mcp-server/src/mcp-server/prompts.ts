// ============================================================================
// DEVTOOLS MCP SERVER - Prompts
// ============================================================================

import {
  createGenericPromptHandlers,
  getGenericAvailablePrompts,
  PromptDefinition,
} from "@mcp/utils";
import {
  DevtoolsWorkflowArgsSchema,
  DevtoolsAutomationArgsSchema,
} from "../schemas/domain-schemas.js";

// ============================================================================
// DEVTOOLS MCP SERVER - Prompts
// ============================================================================

// Prompt implementation functions
function devtoolsWorkflowPrompt(args: unknown = {}) {
  // Validate and parse input with Zod
  const validatedArgs = DevtoolsWorkflowArgsSchema.parse(args);
  const { task } = validatedArgs;
  
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me with this devtools task: ${task || "general workflow"}. Please guide me through:

1. Understanding the requirements
2. Planning the approach
3. Implementing the solution
4. Testing and validation

Let's start - what specific aspect of devtools are we working on?`,
        },
      },
    ],
  };
}

function devtoolsAutomationPrompt(args: unknown = {}) {
  // Validate and parse input with Zod
  const validatedArgs = DevtoolsAutomationArgsSchema.parse(args);
  const { action } = validatedArgs;
  
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Let's automate this devtools action: ${action || "general automation"}. I'll help you:

1. Identify repetitive tasks
2. Design automation workflows
3. Set up triggers and conditions
4. Monitor and optimize

What devtools process would you like to automate?`,
        },
      },
    ],
  };
}

// ============================================================================
// DEVTOOLS MCP SERVER - Prompt Definitions
// ============================================================================

const devtoolsPromptDefinitions: Record<string, PromptDefinition> = {
  "devtools_workflow": {
    handler: async (args) => devtoolsWorkflowPrompt(args),
    metadata: {
      name: "devtools_workflow",
      description: "Step-by-step workflow for devtools tasks",
    },
  },
  "devtools_automation": {
    handler: async (args) => devtoolsAutomationPrompt(args),
    metadata: {
      name: "devtools_automation",
      description: "Automation guidance for devtools processes",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createPromptHandlers = () =>
  createGenericPromptHandlers(devtoolsPromptDefinitions);

export const getAvailablePrompts = () =>
  getGenericAvailablePrompts(devtoolsPromptDefinitions);
