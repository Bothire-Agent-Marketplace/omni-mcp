import chalk from "chalk";
import { Tool } from "@mcp/schemas";
import { MCPClient } from "../../utils/mcp-client.js";

interface QuickTestOptions {
  server?: string;
  url: string;
}

// Quick test cases for each server
const QUICK_TESTS = {
  linear: [
    { tool: "linear_get_teams", args: {}, description: "Get teams" },
    { tool: "linear_get_users", args: { limit: 5 }, description: "Get users" },
  ],
  perplexity: [
    {
      tool: "perplexity_search",
      args: { query: "test", max_results: 1 },
      description: "Search test",
    },
  ],
  devtools: [
    { tool: "chrome_status", args: {}, description: "Check Chrome status" },
    {
      tool: "chrome_start",
      args: { headless: true, autoConnect: true },
      description: "Start Chrome",
    },
  ],
};

export async function quickTest(options: QuickTestOptions): Promise<void> {
  const client = new MCPClient(options.url);

  console.log(chalk.blue.bold("🔧 Quick Test - Omni MCP Servers"));
  console.log(chalk.gray("=".repeat(40)));
  console.log();

  try {
    // Get all available tools
    const toolsResponse = await client.listTools();
    const toolsResult = toolsResponse.result as { tools?: Tool[] };
    const allTools = toolsResult?.tools || [];

    if (allTools.length === 0) {
      console.log(
        chalk.red("❌ No tools available. Make sure servers are running.")
      );
      return;
    }

    // Group tools by server
    const toolsByServer = groupToolsByServer(allTools);

    if (options.server) {
      // Test specific server
      if (toolsByServer[options.server]) {
        await testServer(options.server, toolsByServer[options.server], client);
      } else {
        console.log(
          chalk.red(`❌ Server '${options.server}' not found or not running.`)
        );
      }
    } else {
      // Test all servers
      let totalTests = 0;
      let passedTests = 0;

      for (const [serverName, _tests] of Object.entries(QUICK_TESTS)) {
        if (toolsByServer[serverName]) {
          console.log(
            chalk.blue(`🚀 Testing ${serverName.toUpperCase()} server...`)
          );
          const results = await testServer(
            serverName,
            toolsByServer[serverName],
            client
          );
          totalTests += results.total;
          passedTests += results.passed;
          console.log();
        }
      }

      // Summary
      console.log(chalk.blue.bold("📊 Test Summary"));
      console.log(chalk.gray("-".repeat(20)));
      console.log(`Total tests: ${totalTests}`);
      console.log(`Passed: ${chalk.green(passedTests)}`);
      console.log(`Failed: ${chalk.red(totalTests - passedTests)}`);
      console.log(
        `Success rate: ${chalk.yellow(Math.round((passedTests / totalTests) * 100))}%`
      );
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to run quick test:"), error);
  }
}

function groupToolsByServer(tools: Tool[]): Record<string, Tool[]> {
  const grouped: Record<string, Tool[]> = {};

  for (const tool of tools) {
    let serverName = "unknown";

    if (tool.name.startsWith("linear_")) {
      serverName = "linear";
    } else if (tool.name.startsWith("perplexity_")) {
      serverName = "perplexity";
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
      serverName = "devtools";
    }

    if (!grouped[serverName]) {
      grouped[serverName] = [];
    }
    grouped[serverName].push(tool);
  }

  return grouped;
}

async function testServer(
  serverName: string,
  availableTools: Tool[],
  client: MCPClient
): Promise<{ total: number; passed: number }> {
  const tests = QUICK_TESTS[serverName as keyof typeof QUICK_TESTS] || [];
  const availableToolNames = new Set(availableTools.map((t) => t.name));

  let passed = 0;
  let total = 0;

  for (const test of tests) {
    if (!availableToolNames.has(test.tool)) {
      console.log(
        `  ${chalk.yellow("⚠️")} ${test.description} - Tool not available`
      );
      continue;
    }

    total++;

    try {
      console.log(`  ${chalk.blue("🔄")} ${test.description}...`);
      await client.callTool(test.tool, test.args);
      console.log(`  ${chalk.green("✅")} ${test.description} - Success`);
      passed++;
    } catch (error) {
      console.log(
        `  ${chalk.red("❌")} ${test.description} - Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { total, passed };
}
