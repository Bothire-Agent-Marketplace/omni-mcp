import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ============================================================================
// LINEAR PROMPTS - Clean MCP SDK Pattern
// ============================================================================

export function setupLinearPrompts(server: McpServer) {
  // ============================================================================
  // PROMPT 1: Create Issue Workflow
  // ============================================================================
  server.registerPrompt(
    "create_issue_workflow",
    {
      title: "Create Linear Issue Workflow",
      description:
        "Step-by-step workflow for creating well-structured Linear issues",
      argsSchema: {
        teamId: z
          .string()
          .optional()
          .describe("ID of the team to create the issue for"),
        priority: z
          .string()
          .optional()
          .describe("Default priority level (0-4)"),
      },
    },
    ({ teamId, priority }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
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
    })
  );

  // ============================================================================
  // PROMPT 2: Triage Workflow
  // ============================================================================
  server.registerPrompt(
    "triage_workflow",
    {
      title: "Linear Issue Triage Workflow",
      description:
        "Comprehensive workflow for triaging and prioritizing Linear issues",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
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
    })
  );

  // ============================================================================
  // PROMPT 3: Sprint Planning
  // ============================================================================
  server.registerPrompt(
    "sprint_planning",
    {
      title: "Linear Sprint Planning Workflow",
      description: "Sprint planning workflow using Linear issues and cycles",
      argsSchema: {
        teamId: z
          .string()
          .optional()
          .describe("ID of the team for sprint planning"),
        sprintDuration: z
          .string()
          .optional()
          .describe("Duration of the sprint in weeks"),
      },
    },
    ({ teamId, sprintDuration }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
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
    })
  );
}
