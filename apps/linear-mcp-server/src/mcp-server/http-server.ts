import cors from "@fastify/cors";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";

const logger = createMcpLogger("linear-http-server");

const toolHandlerMap: Record<string, (params: any) => Promise<any>> = {
  linear_search_issues: handlers.handleLinearSearchIssues,
  linear_get_teams: handlers.handleLinearGetTeams,
  linear_get_users: handlers.handleLinearGetUsers,
  linear_get_projects: handlers.handleLinearGetProjects,
  linear_get_issue: handlers.handleLinearGetIssue,
};

export function createHttpServer(): FastifyInstance {
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

  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as any;

    if (jsonrpc !== "2.0" || method !== "tools/call") {
      reply.status(400).send({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
      return;
    }

    const toolName = params?.name;
    const handler = toolHandlerMap[toolName];

    if (!handler) {
      reply.status(404).send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${toolName}`,
        },
      });
      return;
    }

    const result = await handler(params?.arguments || {});
    return { jsonrpc: "2.0", id, result };
  });

  return server;
}

export async function startHttpServer() {
  const server = createHttpServer();
  const port = Number(process.env.PORT) || 3001;

  try {
    await server.listen({ port, host: "0.0.0.0" });
    logger.info(`🚀 Linear MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  } catch (err: any) {
    logger.error("Error starting server", err);
    process.exit(1);
  }
}
