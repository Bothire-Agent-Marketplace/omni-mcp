#!/usr/bin/env node
import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { linearServerConfig } from "./config/config.js";
import { createLinearHttpServer } from "./mcp-server/http-server.js";

const startServer = createServerStarter("linear", createLinearHttpServer);

runMcpServer({
  serverName: "linear-mcp-server",
  config: linearServerConfig,
  startServer,
});
