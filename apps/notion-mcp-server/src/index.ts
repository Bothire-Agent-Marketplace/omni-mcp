#!/usr/bin/env node
import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { notionServerConfig } from "./config/config.js";
import { createNotionHttpServer } from "./mcp-server/http-server.js";
import "./mcp-server/prompts.js";

const startServer = createServerStarter("notion", createNotionHttpServer);

runMcpServer({
  serverName: "notion-mcp-server",
  config: notionServerConfig,
  startServer,
});
