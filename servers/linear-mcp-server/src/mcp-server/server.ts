import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  type ListResourcesRequest,
  type ReadResourceRequest,
  type ListPromptsRequest,
  type GetPromptRequest,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { LINEAR_CONFIG } from "../config/config.js";
import { LinearTools } from "./tools/linear-tools.js";
import { TOOLS } from "./tools.js";
import { RESOURCES } from "./resources.js";
import { PROMPTS } from "./prompts.js";

export function createLinearMcpServer() {
  const server = new Server(
    {
      name: "linear-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  const linearTools = new LinearTools(LINEAR_CONFIG.API_KEY!);

  // Tools handlers
  server.setRequestHandler(
    ListToolsRequestSchema,
    async (request: ListToolsRequest) => {
      return {
        tools: TOOLS,
      };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        let result;
        const toolName = name as keyof LinearTools;

        if (typeof linearTools[toolName] === "function") {
          result = await (linearTools[toolName] as any)(args);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const errorResponse = {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
          executionTime: 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(errorResponse, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Resources handlers
  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (request: ListResourcesRequest) => {
      return {
        resources: RESOURCES,
      };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const { uri } = request.params;

      try {
        let result;

        if (uri === "linear://teams") {
          result = await linearTools.linear_get_teams({});
        } else if (uri.startsWith("linear://projects/")) {
          // Note: linear_get_projects doesn't filter by team, returns all projects
          result = await linearTools.linear_get_projects({});
        } else if (uri.startsWith("linear://workflow-states/")) {
          const teamId = uri.split("/")[2];
          result = await linearTools.linear_get_workflow_states({ teamId });
        } else if (uri === "linear://users") {
          // linear_get_user requires an ID, but this should list all users
          // We need to implement a linear_get_users method or modify the approach
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Getting all users not implemented. Use linear_get_user with specific ID."
          );
        } else {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown resource: ${uri}`
          );
        }

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${errorMessage}`
        );
      }
    }
  );

  // Prompts handlers
  server.setRequestHandler(
    ListPromptsRequestSchema,
    async (request: ListPromptsRequest) => {
      return {
        prompts: PROMPTS,
      };
    }
  );

  server.setRequestHandler(
    GetPromptRequestSchema,
    async (request: GetPromptRequest) => {
      const { name, arguments: args } = request.params;

      const prompt = PROMPTS.find((p) => p.name === name);
      if (!prompt) {
        throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
      }

      // Generate dynamic content based on the prompt
      let content = "";

      if (name === "create_issue_workflow") {
        const { teamId, priority = 3 } = args || {};
        content = `# Linear Issue Creation Workflow

## Step 1: Define the Issue
- **Title**: [Provide a clear, descriptive title]
- **Description**: [Detailed description of the issue]
- **Team**: ${teamId ? `Team ID: ${teamId}` : "[Select appropriate team]"}
- **Priority**: ${priority} (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)

## Step 2: Set Details
- **Assignee**: [Who should work on this?]
- **Labels**: [Add relevant labels]
- **Project**: [Link to project if applicable]
- **Estimate**: [Story points or time estimate]

## Step 3: Create the Issue
Use the linear_create_issue tool with the following structure:
\`\`\`json
{
  "title": "Your issue title",
  "description": "Detailed description",
  "teamId": "${teamId || "TEAM_ID"}",
  "priority": ${priority},
  "assigneeId": "USER_ID",
  "labelIds": ["LABEL_ID_1", "LABEL_ID_2"],
  "projectId": "PROJECT_ID",
  "estimate": 3
}
\`\`\``;
      } else if (name === "triage_workflow") {
        content = `# Linear Issue Triage Workflow

## Step 1: Initial Assessment
1. Review the issue title and description
2. Check for duplicates using linear_search_issues
3. Verify the issue is in the correct team

## Step 2: Prioritization
- **Priority 1 (Urgent)**: Critical bugs, security issues, complete outages
- **Priority 2 (High)**: Important features, significant bugs affecting many users  
- **Priority 3 (Normal)**: Standard features, minor bugs, improvements
- **Priority 4 (Low)**: Nice-to-have features, small improvements

## Step 3: Assignment
1. Get team members: linear_get_teams
2. Check current workload
3. Assign to appropriate team member
4. Set appropriate workflow state

## Step 4: Documentation
1. Add relevant labels
2. Link to related issues/projects
3. Add comments with triage notes`;
      } else if (name === "sprint_planning") {
        content = `# Linear Sprint Planning Workflow

## Pre-Planning
1. Get current sprint issues: linear_get_sprint_issues
2. Review team capacity and availability
3. Gather stakeholder requirements

## Issue Preparation
1. Search and filter backlog issues by priority
2. Ensure issues have:
   - Clear descriptions
   - Acceptance criteria
   - Estimates
   - Proper labels

## Sprint Planning Meeting
1. Review previous sprint outcomes
2. Select issues for upcoming sprint
3. Assign issues to team members
4. Update workflow states to "Ready for Development"

## Tools to Use
- linear_search_issues (filter by team, priority, status)
- linear_get_workflow_states (check available states)
- linear_update_issue (assign and update status)
- linear_get_sprint_issues (review current sprint)`;
      }

      return {
        description: prompt.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: content,
            },
          },
        ],
      };
    }
  );

  return server;
}
