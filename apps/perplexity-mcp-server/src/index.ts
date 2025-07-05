#!/usr/bin/env node

import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { perplexityServerConfig } from "./config/config.js";
import { createPerplexityHttpServer } from "./mcp-server/http-server.js";

const startServer = createServerStarter(
  "perplexity",
  createPerplexityHttpServer
);

runMcpServer({
  serverName: "perplexity-mcp-server",
  config: perplexityServerConfig,
  startServer,
});
