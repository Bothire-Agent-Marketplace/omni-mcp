import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../src/index.js";

let serverInstance: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize server instance if not already created
    if (!serverInstance) {
      serverInstance = await createServer();
    }

    // Handle the request using Fastify's inject method for serverless
    const response = await serverInstance.inject({
      method: req.method as any,
      url: req.url || "/",
      headers: req.headers,
      payload: req.body,
    });

    // Set response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });

    // Set status and send response
    res.status(response.statusCode).send(response.payload);
  } catch (error) {
    console.error("Serverless function error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
