import cors from "@fastify/cors";
import { LinearClient } from "@linear/sdk";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { createMcpLogger } from "@mcp/utils";
import type { LinearServerConfig } from "../config/config.js";
import * as handlers from "./handlers.js";
import {
  createIssueWorkflowPrompt,
  triageWorkflowPrompt,
  sprintPlanningPrompt,
} from "./prompts.js";

function createHttpServer(config: LinearServerConfig): FastifyInstance {
  const logger = createMcpLogger({
    serverName: "linear-http-server",
    logLevel: config.logLevel,
    environment: config.env,
  });

  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  // Tool handlers map
  const toolHandlerMap: Record<string, (params: any) => Promise<any>> = {
    linear_search_issues: handlers.handleLinearSearchIssues.bind(
      null,
      linearClient
    ),
    linear_get_teams: handlers.handleLinearGetTeams.bind(null, linearClient),
    linear_get_users: handlers.handleLinearGetUsers.bind(null, linearClient),
    linear_get_projects: handlers.handleLinearGetProjects.bind(
      null,
      linearClient
    ),
    linear_get_issue: handlers.handleLinearGetIssue.bind(null, linearClient),
  };

  // Resource handlers map
  const resourceHandlerMap: Record<string, (uri: string) => Promise<any>> = {
    "linear://teams": handlers.handleLinearTeamsResource.bind(
      null,
      linearClient
    ),
    "linear://users": handlers.handleLinearUsersResource.bind(
      null,
      linearClient
    ),
  };

  // Prompt handlers map
  const promptHandlerMap: Record<string, (args: any) => Promise<any>> = {
    create_issue_workflow: async (args: any) => createIssueWorkflowPrompt(args),
    triage_workflow: async () => triageWorkflowPrompt(),
    sprint_planning: async (args: any) => sprintPlanningPrompt(args),
  };

  const server = fastify({ logger: false }); // Disable default logger to use our own

  server.register(cors);

  server.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      logger.error("Unhandled error:", error);
      reply.status(500).send({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
      });
    }
  );

  server.get("/health", async () => {
    return { status: "ok" };
  });

  // Main MCP endpoint - handles tools, resources, and prompts
  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as any;

    if (jsonrpc !== "2.0") {
      reply.status(400).send({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
      return;
    }

    try {
      // Handle different MCP methods
      switch (method) {
        case "tools/call": {
          const toolName = params?.name;
          const handler = toolHandlerMap[toolName];

          if (!handler) {
            reply.status(404).send({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Tool not found: ${toolName}`,
              },
            });
            return;
          }

          const result = await handler(params?.arguments || {});
          return { jsonrpc: "2.0", id, result };
        }

        case "resources/read": {
          const uri = params?.uri;
          const handler = resourceHandlerMap[uri];

          if (!handler) {
            reply.status(404).send({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Resource not found: ${uri}`,
              },
            });
            return;
          }

          const result = await handler(uri);
          return { jsonrpc: "2.0", id, result };
        }

        case "prompts/get": {
          const name = params?.name;
          const handler = promptHandlerMap[name];

          if (!handler) {
            reply.status(404).send({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Prompt not found: ${name}`,
              },
            });
            return;
          }

          const result = await handler(params?.arguments || {});
          return { jsonrpc: "2.0", id, result };
        }

        case "tools/list": {
          const tools = Object.keys(toolHandlerMap).map((name) => ({
            name,
            description: getToolDescription(name),
          }));
          return { jsonrpc: "2.0", id, result: { tools } };
        }

        case "resources/list": {
          const resources = Object.keys(resourceHandlerMap).map((uri) => ({
            uri,
            name: getResourceName(uri),
            description: getResourceDescription(uri),
          }));
          return { jsonrpc: "2.0", id, result: { resources } };
        }

        case "prompts/list": {
          const prompts = Object.keys(promptHandlerMap).map((name) => ({
            name,
            description: getPromptDescription(name),
          }));
          return { jsonrpc: "2.0", id, result: { prompts } };
        }

        default:
          reply.status(404).send({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          });
          return;
      }
    } catch (error: any) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const validationErrors = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");

        reply.status(400).send({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params",
            data: `Validation failed: ${validationErrors}`,
          },
        });
        return;
      }

      reply.status(500).send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
      });
    }
  });

  return server;
}

// Helper functions for metadata
function getToolDescription(name: string): string {
  const descriptions: Record<string, string> = {
    linear_search_issues: "Search for Linear issues with optional filters",
    linear_get_teams: "Retrieve all teams in the Linear workspace",
    linear_get_users: "Retrieve users in the Linear workspace",
    linear_get_projects: "Retrieve projects in the Linear workspace",
    linear_get_issue: "Get detailed information about a specific Linear issue",
  };
  return descriptions[name] || "Linear tool";
}

function getResourceName(uri: string): string {
  const names: Record<string, string> = {
    "linear://teams": "linear-teams",
    "linear://users": "linear-users",
  };
  return names[uri] || uri;
}

function getResourceDescription(uri: string): string {
  const descriptions: Record<string, string> = {
    "linear://teams": "List of all Linear teams",
    "linear://users": "List of Linear users for assignment and collaboration",
  };
  return descriptions[uri] || "Linear resource";
}

function getPromptDescription(name: string): string {
  const descriptions: Record<string, string> = {
    create_issue_workflow:
      "Step-by-step workflow for creating well-structured Linear issues",
    triage_workflow:
      "Comprehensive workflow for triaging and prioritizing Linear issues",
    sprint_planning: "Sprint planning workflow using Linear issues and cycles",
  };
  return descriptions[name] || "Linear prompt";
}

export async function startHttpServer(config: LinearServerConfig) {
  const server = createHttpServer(config);
  const { port, host } = config;

  const logger = createMcpLogger({
    serverName: "linear-http-server",
    logLevel: config.logLevel,
    environment: config.env,
  });

  try {
    await server.listen({ port, host });
    logger.info(`🚀 Linear MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  } catch (err: any) {
    logger.error("Error starting server", err);
    process.exit(1);
  }
}
