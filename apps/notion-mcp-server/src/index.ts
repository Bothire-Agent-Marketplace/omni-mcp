#!/usr/bin/env node
import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { notionServerConfig } from "./config/config.js";
import { createNotionHttpServer } from "./mcp-server/http-server.js";
// Ensure prompt modules are registered with the server factory
import "./mcp-server/prompts.js";

const startServer = createServerStarter("notion", createNotionHttpServer);

runMcpServer({
  serverName: "notion-mcp-server",
  config: notionServerConfig,
  startServer,
});
