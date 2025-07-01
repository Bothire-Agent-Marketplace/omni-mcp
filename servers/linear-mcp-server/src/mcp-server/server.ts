import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  type CallToolRequest,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type ReadResourceRequest,
  type GetPromptRequest,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { envConfig } from "@mcp/utils";

import { TOOLS } from "./tools.js";
import { RESOURCES } from "./resources.js";
import { PROMPTS } from "./prompts.js";
import { LinearTools } from "./tools/linear-tools.js";
import {
  SearchIssuesArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
  SearchIssuesArgsSchema,
  CreateIssueArgsSchema,
  UpdateIssueArgsSchema,
} from "../types/linear-types.js";
import { LINEAR_CONFIG } from "../config/config.js";

export function createLinearMcpServer() {
  const server = new Server(
    {
      name: "@mcp/linear-server",
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

  // Initialize Linear tools with API key from environment
  const apiKey = envConfig.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY environment variable is required");
  }
  const linearTools = new LinearTools(apiKey);

  // Tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "linear_search_issues":
            const searchArgs = SearchIssuesArgsSchema.parse(args || {});
            return await linearTools.linear_search_issues(searchArgs);

          case "linear_create_issue":
            const createArgs = CreateIssueArgsSchema.parse(args);
            return await linearTools.linear_create_issue(createArgs);

          case "linear_update_issue":
            const updateArgs = UpdateIssueArgsSchema.parse(args);
            return await linearTools.linear_update_issue(updateArgs);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, error.message);
      }
    }
  );

  // Resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES,
  }));

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const { uri } = request.params;

      // TODO: Implement resource reading logic
      // This would handle linear://teams, linear://projects/{teamId}, etc.

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Resource not implemented: ${uri}`
      );
    }
  );

  // Prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS,
  }));

  server.setRequestHandler(
    GetPromptRequestSchema,
    async (request: GetPromptRequest) => {
      const { name, arguments: args } = request.params;

      // TODO: Implement prompt generation logic
      // This would handle create_issue_workflow, triage_workflow, etc.

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Prompt not implemented: ${name}`
      );
    }
  );

  return server;
}
