import {
  createGenericPromptHandlers,
  getGenericAvailablePrompts,
  PromptDefinition,
} from "@mcp/utils";
import {
  CreateIssueWorkflowArgsSchema,
  SprintPlanningArgsSchema,
} from "../schemas/domain-schemas.js";

// ============================================================================
// LINEAR MCP SERVER - Prompts
// ============================================================================

// Prompt implementation functions
function createIssueWorkflowPrompt(args: unknown = {}) {
  // Validate and parse input with Zod
  const validatedArgs = CreateIssueWorkflowArgsSchema.parse(args);
  const { teamId, priority } = validatedArgs;

  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me create a well-structured Linear issue${
            teamId ? ` for team ${teamId}` : ""
          }${
            priority !== undefined ? ` with priority ${priority}` : ""
          }. Please guide me through:

1. Writing a clear, actionable title
2. Creating a detailed description with acceptance criteria
3. Setting appropriate priority and labels
4. Assigning to the right team member

Let's start with the issue title - what problem are we solving?`,
        },
      },
    ],
  };
}

function triageWorkflowPrompt() {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me triage Linear issues effectively. Let's work through:

1. **Assessment**: Understanding the issue scope and impact
2. **Prioritization**: Setting appropriate priority levels
3. **Assignment**: Identifying the right team member
4. **Labeling**: Adding relevant tags for organization
5. **Timeline**: Estimating effort and setting expectations

What issues do you need help triaging?`,
        },
      },
    ],
  };
}

function sprintPlanningPrompt(args: unknown = {}) {
  // Validate and parse input with Zod
  const validatedArgs = SprintPlanningArgsSchema.parse(args);
  const { teamId, sprintDuration } = validatedArgs;

  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Let's plan an effective sprint${
            teamId ? ` for team ${teamId}` : ""
          }${sprintDuration ? ` (${sprintDuration} weeks)` : ""}. We'll cover:

1. **Sprint Goal**: Defining clear objectives
2. **Capacity Planning**: Understanding team availability
3. **Issue Selection**: Choosing the right mix of work
4. **Story Estimation**: Sizing issues appropriately
5. **Dependencies**: Identifying blockers and prerequisites

What's your sprint goal and what issues are you considering?`,
        },
      },
    ],
  };
}

// ============================================================================
// LINEAR MCP SERVER - Prompt Definitions
// ============================================================================

const linearPromptDefinitions: Record<string, PromptDefinition> = {
  create_issue_workflow: {
    handler: async (args) => createIssueWorkflowPrompt(args),
    metadata: {
      name: "create_issue_workflow",
      description:
        "Step-by-step workflow for creating well-structured Linear issues",
    },
  },
  triage_workflow: {
    handler: async () => triageWorkflowPrompt(),
    metadata: {
      name: "triage_workflow",
      description:
        "Comprehensive workflow for triaging and prioritizing Linear issues",
    },
  },
  sprint_planning: {
    handler: async (args) => sprintPlanningPrompt(args),
    metadata: {
      name: "sprint_planning",
      description: "Sprint planning workflow using Linear issues and cycles",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createPromptHandlers = () =>
  createGenericPromptHandlers(linearPromptDefinitions);

export const getAvailablePrompts = () =>
  getGenericAvailablePrompts(linearPromptDefinitions);
