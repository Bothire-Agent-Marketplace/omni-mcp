import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { LINEAR_CONFIG } from "../config/config.js";
import { LinearTools } from "./tools/linear-tools.js";
import { TOOLS } from "./tools.js";

export function createLinearMcpServer() {
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

  const linearTools = new LinearTools(LINEAR_CONFIG.API_KEY!);

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

  return server;
}
