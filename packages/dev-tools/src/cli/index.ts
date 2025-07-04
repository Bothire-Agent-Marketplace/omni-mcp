#!/usr/bin/env node

import boxen from "boxen";
import chalk from "chalk";
import { Command } from "commander";

const program = new Command();

// ASCII Art Banner
const banner = chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗ ███╗   ███╗███╗   ███╗██╗      ███╗   ███╗    ║
║  ██╔═══██╗████╗ ████║████╗ ████║██║      ████╗ ████║    ║
║  ██║   ██║██╔████╔██║██╔████╔██║██║      ██╔████╔██║    ║  
║  ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██║      ██║╚██╔╝██║    ║
║  ╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║      ██║ ╚═╝ ██║    ║
║   ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝      ╚═╝     ╚═╝    ║
║                                                           ║
║              M C P   D E V   T O O L S                    ║
╚═══════════════════════════════════════════════════════════╝
`);

program
  .name("omni-mcp")
  .description("🔧 Official Omni MCP Development CLI")
  .version("1.0.0")
  .addHelpText("beforeAll", banner);

// Test Gateway Command
program
  .command("test-gateway")
  .alias("tg")
  .description("🌐 Test the MCP gateway")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .option("-i, --interactive", "Interactive testing mode")
  .option("--tools", "Test tools/list endpoint")
  .option("--resources", "Test resources/list endpoint")
  .option("--prompts", "Test prompts/list endpoint")
  .option("--call <toolName>", "Call a specific tool")
  .option("--args <json>", "Tool arguments as JSON", "{}")
  .action(async (options) => {
    const { testGateway } = await import("./commands/test-gateway.js");
    await testGateway(options);
  });

// Test Server Command
program
  .command("test-server")
  .alias("ts")
  .description("🔧 Test a specific MCP server")
  .argument("<server>", "Server name (linear, github, etc.)")
  .option("-p, --port <port>", "Server port")
  .option("-u, --url <url>", "Custom server URL")
  .option("--tools", "Test tools only")
  .option("--resources", "Test resources only")
  .option("--prompts", "Test prompts only")
  .action(async (serverName, options) => {
    const { testServer } = await import("./commands/test-server.js");
    await testServer(serverName, options);
  });

// Health Check Command
program
  .command("health")
  .alias("h")
  .description("🏥 Check health of services")
  .option("--gateway", "Check gateway health only")
  .option("--servers", "Check all servers health")
  .option("--all", "Check everything", true)
  .action(async (options) => {
    const { checkHealth } = await import("./commands/health.js");
    await checkHealth(options);
  });

// Call Tool Command
program
  .command("call")
  .alias("c")
  .description("🔧 Call a tool directly")
  .argument("<toolName>", "Tool name to call")
  .option("-a, --args <json>", "Tool arguments as JSON", "{}")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (toolName, options) => {
    const { callTool } = await import("./commands/call-tool.js");
    await callTool(toolName, options);
  });

// List Command
program
  .command("list")
  .alias("ls")
  .description("📋 List available capabilities")
  .option("--tools", "List tools only")
  .option("--resources", "List resources only")
  .option("--prompts", "List prompts only")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (options) => {
    const { listCapabilities } = await import("./commands/list.js");
    await listCapabilities(options);
  });

// Interactive Mode Command
program
  .command("interactive")
  .alias("i")
  .description("🎯 Interactive MCP testing mode")
  .option("-u, --url <url>", "Gateway URL", "http://localhost:37373")
  .action(async (options) => {
    const { interactiveMode } = await import("./commands/interactive.js");
    await interactiveMode(options);
  });

// Help improvements
program.addHelpText(
  "after",
  `
${chalk.yellow("Examples:")}
  ${chalk.green("omni-mcp test-gateway")}                    Test gateway with all endpoints
  ${chalk.green("omni-mcp test-gateway --interactive")}      Interactive gateway testing
  ${chalk.green("omni-mcp test-server linear")}              Test Linear server directly
  ${chalk.green("omni-mcp call linear_get_teams")}           Call a specific tool
  ${chalk.green("omni-mcp list --tools")}                    List all available tools
  ${chalk.green("omni-mcp health --all")}                    Check health of all services
  ${chalk.green("omni-mcp interactive")}                     Start interactive mode

${chalk.yellow("Common Workflows:")}
  ${chalk.blue("Development Testing:")}
    1. ${chalk.green("omni-mcp health --all")}               Check everything is running
    2. ${chalk.green("omni-mcp list --tools")}               See what tools are available
    3. ${chalk.green("omni-mcp call <tool-name>")}           Test a specific tool

  ${chalk.blue("Gateway Validation:")}
    1. ${chalk.green("omni-mcp test-gateway --tools")}       Test tool discovery
    2. ${chalk.green("omni-mcp test-gateway --interactive")} Interactive testing
    
  ${chalk.blue("Server Development:")}
    1. ${chalk.green("omni-mcp test-server linear")}         Test server directly
    2. ${chalk.green("omni-mcp test-gateway --call linear_get_teams")} Test via gateway

${chalk.yellow("Documentation:")}
  ${chalk.blue("https://github.com/Bothire-Agent-Marketplace/omni-mcp")}
`
);

// Global error handling
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

// Parse and execute
program.parse();
