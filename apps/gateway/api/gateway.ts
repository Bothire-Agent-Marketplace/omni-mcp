import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../src/index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await createServer();
  await server.ready();
  server.server.emit("request", req, res);
}
