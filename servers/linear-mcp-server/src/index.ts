#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "dotenv";
import { LinearTools } from "./linear-tools.js";

// Load environment variables
config();

// =============================================================================
// Linear MCP Server with TypeScript and Zod
// =============================================================================

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error("Error: LINEAR_API_KEY environment variable is required");
  process.exit(1);
}

const server = new Server(
  {
    name: "linear-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const linearTools = new LinearTools(LINEAR_API_KEY);

// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS = [
  {
    name: "linear_search_issues",
    description: "Search for Linear issues with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search in issue titles and descriptions",
        },
        teamId: {
          type: "string",
          description: "Filter by team ID",
        },
        status: {
          type: "string",
          description: "Filter by issue status/state name",
        },
        assigneeId: {
          type: "string",
          description: "Filter by assignee user ID",
        },
        priority: {
          type: "number",
          description:
            "Filter by priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
          minimum: 0,
          maximum: 4,
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (1-50)",
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      },
    },
  },
  {
    name: "linear_create_issue",
    description: "Create a new Linear issue",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Issue title (required)",
        },
        description: {
          type: "string",
          description: "Issue description",
        },
        teamId: {
          type: "string",
          description: "Team ID where the issue will be created (required)",
        },
        assigneeId: {
          type: "string",
          description: "User ID to assign the issue to",
        },
        priority: {
          type: "number",
          description:
            "Issue priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
          minimum: 0,
          maximum: 4,
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of label IDs to apply",
        },
        projectId: {
          type: "string",
          description: "Project ID to associate with",
        },
        estimate: {
          type: "number",
          description: "Story point estimate",
          minimum: 0,
        },
      },
      required: ["title", "teamId"],
    },
  },
  {
    name: "linear_update_issue",
    description: "Update an existing Linear issue",
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Issue ID to update (required)",
        },
        title: {
          type: "string",
          description: "New issue title",
        },
        description: {
          type: "string",
          description: "New issue description",
        },
        assigneeId: {
          type: "string",
          description: "New assignee user ID",
        },
        priority: {
          type: "number",
          description:
            "New priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
          minimum: 0,
          maximum: 4,
        },
        stateId: {
          type: "string",
          description: "New workflow state ID",
        },
        estimate: {
          type: "number",
          description: "New story point estimate",
          minimum: 0,
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "linear_get_issue",
    description: "Get detailed information about a specific Linear issue",
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Issue ID to retrieve (required)",
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "linear_get_teams",
    description: "Get list of Linear teams",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of teams to return (1-100)",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
    },
  },
  {
    name: "linear_get_projects",
    description: "Get list of Linear projects",
    inputSchema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: "Filter projects by team ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of projects to return (1-100)",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
    },
  },
  {
    name: "linear_get_workflow_states",
    description: "Get workflow states (issue statuses) for teams",
    inputSchema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: "Filter states by team ID",
        },
      },
    },
  },
  {
    name: "linear_comment_on_issue",
    description: "Add a comment to a Linear issue",
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Issue ID to comment on (required)",
        },
        body: {
          type: "string",
          description: "Comment text (required)",
        },
      },
      required: ["issueId", "body"],
    },
  },
  {
    name: "linear_get_sprint_issues",
    description: "Get issues from a specific Linear sprint/cycle",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: {
          type: "string",
          description: "Cycle/Sprint ID to get issues from (required)",
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (1-100)",
          minimum: 1,
          maximum: 100,
          default: 50,
        },
      },
      required: ["cycleId"],
    },
  },
  {
    name: "linear_get_user",
    description: "Get Linear user information",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "User ID to get information for",
        },
        email: {
          type: "string",
          description: "User email to search for",
          format: "email",
        },
      },
    },
  },
] as const;

// =============================================================================
// Request Handlers
// =============================================================================

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

      switch (name) {
        case "linear_search_issues":
          result = await linearTools.searchIssues(args);
          break;
        case "linear_create_issue":
          result = await linearTools.createIssue(args);
          break;
        case "linear_update_issue":
          result = await linearTools.updateIssue(args);
          break;
        case "linear_get_issue":
          result = await linearTools.getIssue(args);
          break;
        case "linear_get_teams":
          result = await linearTools.getTeams(args);
          break;
        case "linear_get_projects":
          result = await linearTools.getProjects(args);
          break;
        case "linear_get_workflow_states":
          result = await linearTools.getWorkflowStates(args);
          break;
        case "linear_comment_on_issue":
          result = await linearTools.commentOnIssue(args);
          break;
        case "linear_get_sprint_issues":
          result = await linearTools.getSprintIssues(args);
          break;
        case "linear_get_user":
          result = await linearTools.getUser(args);
          break;
        default:
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

// =============================================================================
// Server Startup
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();

  // Enhanced error handling
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  try {
    await server.connect(transport);
    console.error("Linear MCP Server running on stdio");
    console.error("Server: linear-mcp-server v1.0.0");
    console.error(`Tools available: ${TOOLS.length}`);
    console.error(
      "Linear API Key:",
      LINEAR_API_KEY ? "✓ Configured" : "✗ Missing"
    );
    console.error("Tools:", TOOLS.map((t) => t.name).join(", "));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}
