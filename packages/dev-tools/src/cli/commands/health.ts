import chalk from "chalk";
import { Tool, isJsonRpcSuccessResponse } from "@mcp/schemas";
import { MCPClient } from "../../utils/mcp-client.js";

interface HealthOptions {
  url: string;
}

export async function checkHealth(options: HealthOptions): Promise<void> {
  console.log(chalk.blue.bold("🏥 Health Check - Omni MCP System"));
  console.log(chalk.gray("=".repeat(40)));
  console.log();

  const client = new MCPClient(options.url);

  console.log(chalk.blue("🌐 Gateway Health..."));
  try {
    const response = await fetch(`${options.url}/health`);
    if (response.ok) {
      const health = await response.json();
      console.log(chalk.green("✅ Gateway is healthy"));
      console.log(chalk.gray(`   Status: ${health.status || "OK"}`));
      console.log(chalk.gray(`   URL: ${options.url}`));
    } else {
      console.log(chalk.red("❌ Gateway returned error status"));
    }
  } catch (error) {
    console.log(chalk.red("❌ Gateway is not responding"));
    console.log(
      chalk.gray(
        `   Error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
  console.log();

  console.log(chalk.blue("🔧 Server Health..."));
  try {
    const toolsResponse = await client.listTools();
    const toolsResult = isJsonRpcSuccessResponse(toolsResponse)
      ? (toolsResponse.result as { tools?: Tool[] })
      : { tools: [] };
    const allTools = toolsResult?.tools || [];

    if (allTools.length === 0) {
      console.log(
        chalk.red("❌ No tools available - servers may not be running")
      );
      return;
    }

    const serverStats = getServerStats(allTools);

    console.log(
      chalk.green(`✅ ${Object.keys(serverStats).length} servers responding`)
    );
    console.log(chalk.gray(`   Total tools: ${allTools.length}`));
    console.log();

    for (const [serverName, stats] of Object.entries(serverStats)) {
      const icon = getServerIcon(serverName);
      const port = getServerPort(serverName);
      console.log(
        `${icon} ${chalk.cyan(serverName)} - ${chalk.yellow(stats.count)} tools (Port: ${port})`
      );

      // Show sample tools
      const sampleTools = stats.tools.slice(0, 3);
      for (const tool of sampleTools) {
        console.log(`   ${chalk.gray("•")} ${tool}`);
      }
      if (stats.tools.length > 3) {
        console.log(
          `   ${chalk.gray("•")} ... and ${stats.tools.length - 3} more`
        );
      }
      console.log();
    }
  } catch (error) {
    console.log(chalk.red("❌ Failed to check server health"));
    console.log(
      chalk.gray(
        `   Error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}

function getServerStats(
  tools: Tool[]
): Record<string, { count: number; tools: string[] }> {
  const stats: Record<string, { count: number; tools: string[] }> = {};

  for (const tool of tools) {
    let serverName = "Unknown";

    if (tool.name.startsWith("linear_")) {
      serverName = "Linear MCP Server";
    } else if (tool.name.startsWith("perplexity_")) {
      serverName = "Perplexity MCP Server";
    } else if (
      tool.name.startsWith("chrome_") ||
      tool.name.startsWith("console_") ||
      tool.name.startsWith("dom_") ||
      tool.name.startsWith("network_") ||
      tool.name.startsWith("screenshot_") ||
      tool.name.startsWith("debug_") ||
      tool.name.startsWith("css_") ||
      tool.name.startsWith("storage_") ||
      tool.name.startsWith("error_")
    ) {
      serverName = "Chrome DevTools MCP Server";
    }

    if (!stats[serverName]) {
      stats[serverName] = { count: 0, tools: [] };
    }
    stats[serverName].count++;
    stats[serverName].tools.push(tool.name);
  }

  return stats;
}

function getServerIcon(serverName: string): string {
  if (serverName.includes("Linear")) return "📊";
  if (serverName.includes("Perplexity")) return "🔍";
  if (serverName.includes("Chrome")) return "🌐";
  return "🔧";
}

function getServerPort(serverName: string): number {
  if (serverName.includes("Linear")) return 3001;
  if (serverName.includes("Perplexity")) return 3002;
  if (serverName.includes("Chrome")) return 3004;
  return 3000;
}
