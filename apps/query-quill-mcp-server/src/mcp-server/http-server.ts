import cors from "@fastify/cors";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { createMcpLogger } from "@mcp/utils";
import { CONFIG } from "../config/config.js";
import * as handlers from "./handlers.js";

const logger = createMcpLogger(`${CONFIG.SERVICE_NAME}-http`);

const handlerMap: Record<string, (params: any) => Promise<any>> = {
  customer_lookup: handlers.handleCustomerLookup,
  film_inventory: handlers.handleFilmInventory,
  rental_analysis: handlers.handleRentalAnalysis,
  payment_investigation: handlers.handlePaymentInvestigation,
  business_analytics: handlers.handleBusinessAnalytics,
  database_health: handlers.handleDatabaseHealth,
};

export function createHttpServer(): FastifyInstance {
  const server = fastify({ logger: false });

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

  server.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return { status: "ok" };
    }
  );

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
    const handler = handlerMap[toolName];

    if (!handler) {
      reply.status(404).send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${toolName}` },
      });
      return;
    }

    const result = await handler(params?.arguments || {});
    return { jsonrpc: "2.0", id, result };
  });

  return server;
}

export async function startHttpServer(port: number) {
  const server = createHttpServer();

  try {
    await server.listen({ port, host: "0.0.0.0" });
    logger.info(`🚀 query-quill MCP HTTP server listening on port ${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  } catch (err: any) {
    logger.error("Error starting server", err);
    process.exit(1);
  }
}
