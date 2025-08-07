#!/usr/bin/env node
import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { devtoolsServerConfig } from "./config/config.js";
import { createHttpServer } from "./mcp-server/http-server.js";

const startServer = createServerStarter("devtools", createHttpServer);

runMcpServer({
  serverName: "devtools-mcp-server",
  config: devtoolsServerConfig,
  startServer,
});
