#!/usr/bin/env node

import { serverRegistry } from "../packages/capabilities/dist/index.js";

function listServers() {
  const servers = serverRegistry.getAllServers();

  console.log("📋 Registered MCP Servers:\n");

  if (Object.keys(servers).length === 0) {
    console.log("   No servers registered yet.");
    return;
  }

  for (const [name, server] of Object.entries(servers)) {
    console.log(`🔧 ${name.toUpperCase()} (${server.description})`);
    console.log(`   Port: ${server.port}`);
    console.log(`   Production URL: ${server.productionUrl}`);
    console.log(`   Environment Variable: ${server.envVar}`);

    if (server.tools.length > 0) {
      console.log(`   Tools: ${server.tools.join(", ")}`);
    }

    if (server.resources.length > 0) {
      console.log(`   Resources: ${server.resources.join(", ")}`);
    }

    if (server.prompts.length > 0) {
      console.log(`   Prompts: ${server.prompts.join(", ")}`);
    }

    console.log();
  }

  console.log(`📊 Total: ${Object.keys(servers).length} servers registered`);
}

listServers();
