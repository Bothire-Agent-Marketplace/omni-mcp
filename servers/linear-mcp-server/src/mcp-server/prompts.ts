// TODO: Import from shared schemas once TypeScript path mapping is configured
// import { LINEAR_PROMPTS, Prompt, PromptArgument } from "@mcp/schemas";

interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

interface Prompt {
  name: string;
  description: string;
  arguments: readonly PromptArgument[];
}

export const PROMPTS: readonly Prompt[] = [
  {
    name: "create_issue_workflow",
    description:
      "Step-by-step workflow for creating well-structured Linear issues",
    arguments: [
      {
        name: "teamId",
        description: "ID of the team to create the issue for",
        required: false,
      },
      {
        name: "priority",
        description: "Default priority level (0-4)",
        required: false,
      },
    ],
  },
  {
    name: "triage_workflow",
    description:
      "Comprehensive workflow for triaging and prioritizing Linear issues",
    arguments: [],
  },
  {
    name: "sprint_planning",
    description: "Sprint planning workflow using Linear issues and cycles",
    arguments: [
      {
        name: "teamId",
        description: "ID of the team for sprint planning",
        required: false,
      },
      {
        name: "sprintDuration",
        description: "Duration of the sprint in weeks",
        required: false,
      },
    ],
  },
] as const;
