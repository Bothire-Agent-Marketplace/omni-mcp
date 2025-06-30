#!/usr/bin/env node

import { Command } from "commander";
import { createMcpServer } from "./commands/create.js";
import { listMcpServers } from "./commands/list.js";
import { removeMcpServer } from "./commands/remove.js";
import { validateMcpServer } from "./commands/validate.js";

const program = new Command();

program
  .name("omni")
  .description(
    "🚀 Omni MCP Development CLI - Enterprise-grade MCP server management"
  )
  .version("1.0.0");

// Create MCP Server command
program
  .command("create")
  .description(
    "🏗️  Create a new MCP server following Enterprise MCP Server Pattern"
  )
  .argument("<service-name>", "Name of the service (e.g., github, jira, slack)")
  .option("-t, --template <type>", "Template type", "standard")
  .option("-p, --port <port>", "Default port for the server", "3000")
  .option("--skip-schemas", "Skip creating shared schemas")
  .option("--skip-docker", "Skip Docker configuration")
  .action(createMcpServer);

// List MCP Servers command
program
  .command("list")
  .description("📋 List all MCP servers in the project")
  .option("-v, --verbose", "Show detailed information")
  .action(listMcpServers);

// Remove MCP Server command
program
  .command("remove")
  .description("🗑️  Remove an MCP server from the project")
  .argument("<service-name>", "Name of the service to remove")
  .option("-f, --force", "Force removal without confirmation")
  .option("--keep-schemas", "Keep shared schemas")
  .action(removeMcpServer);

// Validate MCP Server command
program
  .command("validate")
  .description("🔍 Validate MCP server compliance with Enterprise Pattern")
  .argument(
    "[service-name]",
    "Service name to validate (optional, validates all if not provided)"
  )
  .option("-f, --fix", "Attempt to fix compliance issues automatically")
  .action(validateMcpServer);

// Development shortcuts
program
  .command("dev")
  .description("🚀 Start development environment for MCP server")
  .argument("<service-name>", "Service name to develop")
  .action(async (serviceName: string) => {
    console.log(`🚀 Starting development for ${serviceName} MCP server...`);
    // Implementation would start the specific server in dev mode
  });

program
  .command("test")
  .description("🧪 Test MCP server functionality")
  .argument("<service-name>", "Service name to test")
  .action(async (serviceName: string) => {
    console.log(`🧪 Testing ${serviceName} MCP server...`);
    // Implementation would run server tests
  });

program.parse();
