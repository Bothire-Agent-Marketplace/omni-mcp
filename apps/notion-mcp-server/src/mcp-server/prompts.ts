import { PromptDefinition } from "@mcp/utils";
import {
  NotionWorkflowArgsSchema,
  NotionAutomationArgsSchema,
} from "../schemas/domain-schemas.js";

function notionWorkflowPrompt(args: unknown = {}) {
  const validatedArgs = NotionWorkflowArgsSchema.parse(args);
  const { task } = validatedArgs;

  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me with this notion task: ${task || "general workflow"}. Please guide me through:

1. Understanding the requirements
2. Planning the approach
3. Implementing the solution
4. Testing and validation

Let's start - what specific aspect of notion are we working on?`,
        },
      },
    ],
  };
}

function notionAutomationPrompt(args: unknown = {}) {
  const validatedArgs = NotionAutomationArgsSchema.parse(args);
  const { action } = validatedArgs;

  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Let's automate this notion action: ${action || "general automation"}. I'll help you:

1. Identify repetitive tasks
2. Design automation workflows
3. Set up triggers and conditions
4. Monitor and optimize

What notion process would you like to automate?`,
        },
      },
    ],
  };
}

const _notionPromptDefinitions: Record<string, PromptDefinition> = {
  notion_workflow: {
    handler: async (args) => notionWorkflowPrompt(args),
    metadata: {
      name: "notion_workflow",
      description: "Step-by-step workflow for notion tasks",
    },
  },
  notion_automation: {
    handler: async (args) => notionAutomationPrompt(args),
    metadata: {
      name: "notion_automation",
      description: "Automation guidance for notion processes",
    },
  },
};
