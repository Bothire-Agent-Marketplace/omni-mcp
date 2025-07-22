import chalk from "chalk";
import { Tool, isJsonRpcSuccessResponse } from "@mcp/schemas";
import { MCPClient } from "../../utils/mcp-client.js";

interface ShowcaseOptions {
  examples?: boolean;
  test?: boolean;
  url: string;
}

// Example payloads for each server
const SERVER_EXAMPLES = {
  linear: {
    name: "Linear MCP Server",
    description: "Project management, teams, and issue tracking",
    port: 3001,
    examples: {
      linear_get_teams: {},
      linear_get_users: { limit: 10 },
      linear_get_issues: { limit: 5, state: "active" },
      linear_create_issue: {
        title: "Example Issue",
        description: "This is a test issue created via MCP",
        priority: 2,
      },
      linear_get_projects: { limit: 5 },
      linear_search_issues: { query: "bug", limit: 10 },
    },
  },
  perplexity: {
    name: "Perplexity MCP Server",
    description: "AI-powered search and research capabilities",
    port: 3002,
    examples: {
      perplexity_search: {
        query: "What are the latest developments in AI?",
        max_results: 5,
      },
      perplexity_research: {
        topic: "TypeScript best practices",
        depth: "detailed",
      },
      perplexity_summarize: {
        text: "Long text to summarize...",
        length: "short",
      },
    },
  },
  devtools: {
    name: "Chrome DevTools MCP Server",
    description: "Browser automation and debugging tools",
    port: 3003,
    examples: {
      // Chrome Management
      chrome_start: { headless: false, autoConnect: true },
      chrome_navigate: { url: "https://example.com" },
      chrome_status: {},

      // Console Tools
      console_logs: { limit: 10 },
      console_execute: { expression: "document.title" },

      // DOM Tools
      dom_query: { selector: "h1" },
      dom_document: {},
      dom_click: { nodeId: 1 },

      // Network Tools
      network_requests: { limit: 5 },

      // Screenshot
      screenshot_page: { format: "png" },

      // Debugging
      debug_set_breakpoint: { url: "app.js", lineNumber: 42 },
      debug_evaluate: { expression: "window.location.href" },
    },
  },
};

export async function showcaseCapabilities(
  server: string,
  options: ShowcaseOptions
): Promise<void> {
  const client = new MCPClient(options.url);

  console.log(chalk.blue.bold("🎯 Omni MCP Server Capability Showcase"));
  console.log(chalk.gray("=".repeat(50)));
  console.log();

  try {
    const toolsResponse = await client.listTools();
    const toolsResult = isJsonRpcSuccessResponse(toolsResponse)
      ? (toolsResponse.result as { tools?: Tool[] })
      : { tools: [] };
    const allTools = toolsResult?.tools || [];

    if (allTools.length === 0) {
      console.log(
        chalk.red("❌ No tools available. Make sure servers are running.")
      );
      return;
    }

    const toolsByServer = groupToolsByServer(allTools);

    if (server === "all") {
      for (const [serverName, serverInfo] of Object.entries(SERVER_EXAMPLES)) {
        if (toolsByServer[serverName]) {
          await showcaseServer(
            serverName,
            serverInfo,
            toolsByServer[serverName],
            options,
            client
          );
          console.log();
        }
      }
    } else {
      const serverInfo =
        SERVER_EXAMPLES[server as keyof typeof SERVER_EXAMPLES];
      if (!serverInfo) {
        console.log(chalk.red(`❌ Unknown server: ${server}`));
        console.log(
          chalk.yellow("Available servers: linear, perplexity, devtools")
        );
        return;
      }

      if (!toolsByServer[server]) {
        console.log(
          chalk.red(`❌ No tools found for ${server} server. Is it running?`)
        );
        return;
      }

      await showcaseServer(
        server,
        serverInfo,
        toolsByServer[server],
        options,
        client
      );
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to showcase capabilities:"), error);
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

async function showcaseServer(
  serverName: string,
  serverInfo: {
    name: string;
    port: number;
    description: string;
    examples: Record<string, unknown>;
  },
  tools: Tool[],
  options: ShowcaseOptions,
  client: MCPClient
): Promise<void> {
  console.log(chalk.blue.bold(`🚀 ${serverInfo.name}`));
  console.log(
    chalk.gray(`Port: ${serverInfo.port} | ${serverInfo.description}`)
  );
  console.log(chalk.yellow(`📊 ${tools.length} tools available`));
  console.log();

  // Group tools by category for devtools
  if (serverName === "devtools") {
    const categories = groupDevToolsByCategory(tools);

    for (const [category, categoryTools] of Object.entries(categories)) {
      console.log(chalk.cyan(`  ${category}:`));

      for (const tool of categoryTools) {
        console.log(
          `    ${chalk.green("•")} ${tool.name} - ${tool.description || "No description"}`
        );

        if (options.examples) {
          const example = serverInfo.examples[tool.name];
          if (example) {
            console.log(
              `      ${chalk.gray("Example:")} ${chalk.dim(JSON.stringify(example))}`
            );
          }
        }

        if (options.test) {
          await testTool(
            tool,
            (serverInfo.examples[tool.name] as Record<string, unknown>) || {},
            client
          );
        }
      }
      console.log();
    }
  } else {
    // Regular server display
    for (const tool of tools) {
      console.log(
        `  ${chalk.green("•")} ${tool.name} - ${tool.description || "No description"}`
      );

      if (options.examples) {
        const example = serverInfo.examples[tool.name];
        if (example) {
          console.log(
            `    ${chalk.gray("Example:")} ${chalk.dim(JSON.stringify(example))}`
          );
        }
      }

      if (options.test) {
        await testTool(
          tool,
          (serverInfo.examples[tool.name] as Record<string, unknown>) || {},
          client
        );
      }
    }
  }
}

function groupDevToolsByCategory(tools: Tool[]): Record<string, Tool[]> {
  const categories: Record<string, Tool[]> = {};

  for (const tool of tools) {
    let category = "Other";

    if (tool.name.startsWith("chrome_")) {
      category = "Chrome Management";
    } else if (tool.name.startsWith("console_")) {
      category = "Console Tools";
    } else if (tool.name.startsWith("dom_")) {
      category = "DOM Manipulation";
    } else if (tool.name.startsWith("network_")) {
      category = "Network Monitoring";
    } else if (tool.name.startsWith("screenshot_")) {
      category = "Screenshot";
    } else if (tool.name.startsWith("debug_")) {
      category = "Debugging Tools";
    } else if (tool.name.startsWith("css_")) {
      category = "CSS Inspection";
    } else if (tool.name.startsWith("storage_")) {
      category = "Storage Tools";
    } else if (tool.name.startsWith("error_")) {
      category = "Error Handling";
    }

    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(tool);
  }

  return categories;
}

async function testTool(
  tool: Tool,
  exampleArgs: Record<string, unknown> | Record<string, never>,
  client: MCPClient
): Promise<void> {
  try {
    console.log(`    ${chalk.yellow("Testing...")} ${tool.name}`);
    await client.callTool(tool.name, exampleArgs);
    console.log(`    ${chalk.green("✅ Success")}`);
  } catch (error) {
    console.log(
      `    ${chalk.red("❌ Failed:")} ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
