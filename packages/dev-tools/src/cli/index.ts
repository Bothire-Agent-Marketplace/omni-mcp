#!/usr/bin/env node

import boxen from "boxen";
import chalk from "chalk";
import { program } from "commander";

console.log(
  boxen(
    `${chalk.blue.bold("🚀 Omni MCP")} ${chalk.gray("Development CLI")}\n${chalk.yellow(
      "Server Capability Showcase & Testing"
    )}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "blue",
    }
  )
);

program
  .name("omni-mcp")
  .description("🚀 Omni MCP Server Capability Showcase & Testing CLI")
  .version("1.0.0");

program
  .command("showcase")
  .alias("show")
  .description("🎯 Showcase server capabilities with example payloads")
  .argument(
    "[server]",
    "Server to showcase (linear, perplexity, devtools, all)"
  )
  .option("-e, --examples", "Show example payloads for each tool")
  .option("-t, --test", "Test tools with example payloads")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (server, options) => {
    const { showcaseCapabilities } = await import("./commands/showcase.js");
    await showcaseCapabilities(server || "all", options);
  });

program
  .command("test")
  .alias("t")
  .description("🔧 Quick test of all servers via gateway")
  .option("-s, --server <name>", "Test specific server only")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (options) => {
    const { quickTest } = await import("./commands/quick-test.js");
    await quickTest(options);
  });

program
  .command("health")
  .alias("h")
  .description("🏥 Check health of all servers and gateway")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (options) => {
    const { checkHealth } = await import("./commands/health.js");
    await checkHealth(options);
  });

program
  .command("call")
  .alias("c")
  .description("⚡ Call a tool with arguments")
  .argument("<toolName>", "Tool name to call")
  .option("-a, --args <json>", "Tool arguments as JSON", "{}")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (toolName, options) => {
    const { callTool } = await import("./commands/call-tool.js");
    await callTool(toolName, options);
  });

program
  .command("interactive")
  .alias("i")
  .description("🎮 Interactive server exploration mode")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (options) => {
    const { interactiveMode } = await import("./commands/interactive.js");
    await interactiveMode(options);
  });

program.addHelpText(
  "after",
  `
${chalk.yellow("🎯 Main Commands:")}
  ${chalk.green("omni-mcp showcase")}                       Show all server capabilities
  ${chalk.green("omni-mcp showcase linear")}                Show Linear server tools
  ${chalk.green("omni-mcp showcase devtools --examples")}   Show Chrome DevTools with examples
  ${chalk.green("omni-mcp test")}                           Quick test all servers
  ${chalk.green("omni-mcp health")}                         Check server health

${chalk.yellow("🔧 Development:")}
  ${chalk.green("omni-mcp call linear_get_teams")}          Call specific tool
  ${chalk.green("omni-mcp interactive")}                    Interactive exploration

${chalk.yellow("📊 Server Capabilities:")}
  ${chalk.blue("Linear MCP Server")}        - Project management, teams, issues
  ${chalk.blue("Perplexity MCP Server")}    - AI search, research, content generation  
  ${chalk.blue("Chrome DevTools Server")}   - Browser automation, debugging, testing

${chalk.yellow("🚀 Quick Start:")}
  1. ${chalk.green("omni-mcp health")}                      Check everything is running
  2. ${chalk.green("omni-mcp showcase --examples")}         See what's available
  3. ${chalk.green("omni-mcp test")}                        Test key functionality

${chalk.yellow("Documentation:")}
  ${chalk.blue("https://github.com/Bothire-Agent-Marketplace/omni-mcp")}
`
);

process.on("uncaughtException", (error) => {
  console.error(
    boxen(chalk.red(`❌ Uncaught Exception:\n${error.message}`), {
      padding: 1,
      borderColor: "red",
      borderStyle: "round",
      title: "Error",
      titleAlignment: "center",
    })
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(
    boxen(chalk.red(`❌ Unhandled Rejection:\n${reason}`), {
      padding: 1,
      borderColor: "red",
      borderStyle: "round",
      title: "Error",
      titleAlignment: "center",
    })
  );
  process.exit(1);
});

program.parse();
