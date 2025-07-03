import {
  createIssueWorkflowPrompt,
  triageWorkflowPrompt,
  sprintPlanningPrompt,
} from "./prompts.js";

// Prompt handler function type
export type PromptHandler = (args: Record<string, unknown>) => Promise<{
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}>;

// Prompt definition interface
export interface PromptDefinition {
  name: string;
  description: string;
  handler: PromptHandler;
}

// Create prompt handlers
export function createPromptHandlers(): Record<string, PromptHandler> {
  return {
    create_issue_workflow: async (args) => createIssueWorkflowPrompt(args),
    triage_workflow: async () => triageWorkflowPrompt(),
    sprint_planning: async (args) => sprintPlanningPrompt(args),
  };
}

// Prompt metadata and descriptions
export const PROMPT_DEFINITIONS: Record<
  string,
  Omit<PromptDefinition, "handler">
> = {
  create_issue_workflow: {
    name: "create_issue_workflow",
    description:
      "Step-by-step workflow for creating well-structured Linear issues",
  },
  triage_workflow: {
    name: "triage_workflow",
    description:
      "Comprehensive workflow for triaging and prioritizing Linear issues",
  },
  sprint_planning: {
    name: "sprint_planning",
    description: "Sprint planning workflow using Linear issues and cycles",
  },
};

// Get all available prompts with metadata
export function getAvailablePrompts(): Array<{
  name: string;
  description: string;
}> {
  return Object.values(PROMPT_DEFINITIONS);
}

// Get prompt description by name
export function getPromptDescription(name: string): string {
  return PROMPT_DEFINITIONS[name]?.description || "Linear prompt";
}
