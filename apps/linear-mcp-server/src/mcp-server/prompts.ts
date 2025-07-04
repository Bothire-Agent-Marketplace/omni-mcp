import {
  CreateIssueWorkflowArgsSchema,
  SprintPlanningArgsSchema,
} from "../schemas/domain-schemas.js";

// ============================================================================
// REUSABLE PROMPT FUNCTIONS - Used by both MCP server and HTTP server
// ============================================================================

export function createIssueWorkflowPrompt(args: unknown = {}) {
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

export function triageWorkflowPrompt() {
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

export function sprintPlanningPrompt(args: unknown = {}) {
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

// Note: setupLinearPrompts function removed as it was unused.
// The reusable prompt functions above can be imported and used directly.
