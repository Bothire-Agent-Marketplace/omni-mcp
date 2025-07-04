#!/usr/bin/env node

import { serverRegistry } from "../packages/capabilities/dist/index.js";

async function checkServerHealth(serverName, url) {
  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      timeout: 5000,
    });

    if (response.ok) {
      const data = await response.json();
      return { status: "healthy", data };
    } else {
      return { status: "unhealthy", error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}

async function checkAllServers() {
  const servers = serverRegistry.getAllServers();
  const results = [];

  console.log("🔍 Checking health of all MCP servers...\n");

  for (const [name, server] of Object.entries(servers)) {
    const url = process.env[server.envVar] || `http://localhost:${server.port}`;
    const health = await checkServerHealth(name, url);

    results.push({ name, url, health });

    const statusIcon = health.status === "healthy" ? "✅" : "❌";
    console.log(`${statusIcon} ${name}: ${health.status}`);
    console.log(`   URL: ${url}`);

    if (health.status === "unhealthy") {
      console.log(`   Error: ${health.error}`);
    } else {
      console.log(`   Version: ${health.data?.version || "unknown"}`);
    }
    console.log();
  }

  const healthyCount = results.filter(
    (r) => r.health.status === "healthy"
  ).length;
  const totalCount = results.length;

  console.log(`📊 Summary: ${healthyCount}/${totalCount} servers healthy`);

  if (healthyCount < totalCount) {
    console.log("\n💡 To start unhealthy servers:");
    results
      .filter((r) => r.health.status === "unhealthy")
      .forEach((r) => {
        console.log(`   pnpm dev --filter=@mcp/${r.name}-server`);
      });
    process.exit(1);
  }
}

checkAllServers().catch(console.error);
