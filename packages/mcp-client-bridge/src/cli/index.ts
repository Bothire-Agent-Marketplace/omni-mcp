#!/usr/bin/env node

import { parseArgs } from "util";
import { ConfigManager } from "../config/config-manager.js";
import { MCPClientType, Environment } from "../types/client-types.js";

interface CLIOptions {
  command: string;
  servers?: string;
  clients?: string;
  environment?: Environment;
  debug?: boolean;
  output?: string;
  validate?: boolean;
  test?: boolean;
  help?: boolean;
}

const USAGE = `
MCP Client Bridge CLI

USAGE:
  mcp-client-bridge <command> [options]

COMMANDS:
  generate    Generate client configurations
  validate    Validate bridge configurations
  test        Test server connections
  deploy      Deploy configurations to client directories

OPTIONS:
  --servers <json>       Server configuration JSON string or @file.json
  --clients <list>       Comma-separated list of clients (cursor,claude-desktop)
  --environment <env>    Environment (development|staging|production)
  --debug               Enable debug mode
  --output <dir>        Output directory for generated configs
  --help                Show this help message

EXAMPLES:
  # Generate configs for local gateway
  mcp-client-bridge generate --servers '{"gateway":"http://localhost:37373"}'
  
  # Generate with custom environment
  mcp-client-bridge generate --servers @servers.json --environment production
  
  # Validate configuration
  mcp-client-bridge validate --servers '{"gateway":"http://localhost:37373"}'
  
  # Test connections
  mcp-client-bridge test --servers '{"gateway":"http://localhost:37373"}'
  
  # Deploy to client directories
  mcp-client-bridge deploy --servers '{"gateway":"http://localhost:37373"}'
`;

async function parseServers(
  serversInput: string
): Promise<Record<string, string>> {
  if (serversInput.startsWith("@")) {
    // Load from file
    const { readFile } = await import("fs/promises");
    const filePath = serversInput.slice(1);
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } else {
    // Parse as JSON string
    return JSON.parse(serversInput);
  }
}

async function generateCommand(options: CLIOptions): Promise<void> {
  if (!options.servers) {
    throw new Error("--servers is required for generate command");
  }

  const servers = await parseServers(options.servers);
  const clientTypes = (options.clients?.split(",") as MCPClientType[]) || [
    "cursor",
    "claude-desktop",
  ];

  console.log("🔧 Generating MCP client configurations...");

  const manager = ConfigManager.fromServers(servers, {
    environment: options.environment || "development",
    bridgeOptions: {
      debug: options.debug || options.environment === "development",
    },
  });

  const configs = await manager.generateConfigs(clientTypes);

  if (options.output) {
    // Save to output directory
    const { writeFile, mkdir } = await import("fs/promises");
    const { resolve } = await import("path");

    await mkdir(options.output, { recursive: true });

    for (const [clientType, config] of Object.entries(configs)) {
      const filename = `${clientType}-config.json`;
      const filepath = resolve(options.output, filename);
      await writeFile(filepath, JSON.stringify(config, null, 2));
      console.log(`✅ ${clientType} config saved to: ${filepath}`);
    }
  } else {
    // Print to stdout
    console.log("\n📄 Generated configurations:");
    console.log(JSON.stringify(configs, null, 2));
  }

  // Show summary
  const summary = manager.getSummary();
  console.log(`\n📊 Summary:`);
  console.log(`   Environment: ${summary.environment}`);
  console.log(`   Servers: ${summary.serverCount}`);
  summary.servers.forEach((server) => {
    console.log(`   - ${server.name}: ${server.url}`);
  });
}

async function validateCommand(options: CLIOptions): Promise<void> {
  if (!options.servers) {
    throw new Error("--servers is required for validate command");
  }

  const servers = await parseServers(options.servers);

  console.log("🔍 Validating MCP bridge configurations...");

  const manager = ConfigManager.fromServers(servers, {
    environment: options.environment || "development",
    bridgeOptions: {
      debug: options.debug || false,
    },
  });

  const results = await manager.validateAll();

  console.log("\n📋 Validation Results:");
  let allValid = true;
  for (const [client, isValid] of Object.entries(results)) {
    console.log(
      `   ${isValid ? "✅" : "❌"} ${client}: ${isValid ? "Valid" : "Invalid"}`
    );
    if (!isValid) allValid = false;
  }

  if (!allValid) {
    process.exit(1);
  }

  console.log("\n🎉 All configurations are valid!");
}

async function testCommand(options: CLIOptions): Promise<void> {
  if (!options.servers) {
    throw new Error("--servers is required for test command");
  }

  const servers = await parseServers(options.servers);

  console.log("🌐 Testing server connections...");

  const manager = ConfigManager.fromServers(servers, {
    environment: options.environment || "development",
    bridgeOptions: {
      debug: options.debug || false,
    },
  });

  const results = await manager.testAllConnections();

  console.log("\n📡 Connection Test Results:");
  let allConnected = true;
  for (const [server, isConnected] of Object.entries(results)) {
    console.log(
      `   ${isConnected ? "✅" : "❌"} ${server}: ${isConnected ? "Connected" : "Failed"}`
    );
    if (!isConnected) allConnected = false;
  }

  if (!allConnected) {
    console.log(
      "\n⚠️  Some connections failed. Check server URLs and ensure servers are running."
    );
    process.exit(1);
  }

  console.log("\n🎉 All connections successful!");
}

async function deployCommand(options: CLIOptions): Promise<void> {
  if (!options.servers) {
    throw new Error("--servers is required for deploy command");
  }

  const servers = await parseServers(options.servers);
  const clientTypes = (options.clients?.split(",") as MCPClientType[]) || [
    "cursor",
    "claude-desktop",
  ];

  console.log("🚀 Deploying MCP client configurations...");

  const manager = ConfigManager.fromServers(servers, {
    environment: options.environment || "development",
    bridgeOptions: {
      debug: options.debug || options.environment === "development",
    },
  });

  await manager.saveConfigs(clientTypes);

  console.log("\n🎉 Deployment complete!");
}

async function main(): Promise<void> {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        servers: { type: "string" },
        clients: { type: "string" },
        environment: { type: "string" },
        debug: { type: "boolean" },
        output: { type: "string" },
        help: { type: "boolean" },
      },
      allowPositionals: true,
    });

    const options: CLIOptions = {
      command: positionals[0] || "",
      servers: values.servers,
      clients: values.clients,
      environment: values.environment as Environment,
      debug: values.debug,
      output: values.output,
      help: values.help,
    };

    if (options.help || !options.command) {
      console.log(USAGE);
      process.exit(0);
    }

    switch (options.command) {
      case "generate":
        await generateCommand(options);
        break;
      case "validate":
        await validateCommand(options);
        break;
      case "test":
        await testCommand(options);
        break;
      case "deploy":
        await deployCommand(options);
        break;
      default:
        console.error(`❌ Unknown command: ${options.command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (error) {
    console.error(
      `❌ Error: ${error instanceof Error ? error.message : error}`
    );
    process.exit(1);
  }
}

main();
