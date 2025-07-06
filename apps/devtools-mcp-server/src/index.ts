#!/usr/bin/env node
import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { devtoolsServerConfig } from "./config/config.js";
import { createDevtoolsHttpServer } from "./mcp-server/http-server.js";

const startServer = createServerStarter("devtools", createDevtoolsHttpServer);

runMcpServer({
  serverName: "devtools-mcp-server",
  config: devtoolsServerConfig,
  startServer,
});
