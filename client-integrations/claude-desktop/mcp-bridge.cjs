#!/usr/bin/env node

/**
 * MCP Bridge using Supergateway
 * Bridges Claude Desktop (stdio) to HTTP MCP Gateway
 */

const { spawn } = require("child_process");
const path = require("path");

// Configuration
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:37373/mcp";
const GATEWAY_API_KEY = process.env.MCP_API_KEY || "";

// Function to start the bridge
function startBridge() {
  console.error("Starting MCP Bridge using Supergateway...");
  console.error(`Gateway URL: ${GATEWAY_URL}`);

  // Build the supergateway command
  const args = [
    "supergateway",
    "--inputTransport",
    "stdio",
    "--outputTransport",
    "streamableHttp",
    "--httpUrl",
    GATEWAY_URL,
  ];

  // Add API key if provided
  if (GATEWAY_API_KEY) {
    args.push("--httpHeaders", `x-api-key=${GATEWAY_API_KEY}`);
  }

  console.error("Running command:", "npx", args.join(" "));

  // Spawn the supergateway process
  const bridge = spawn("npx", args, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  bridge.on("error", (error) => {
    console.error("Bridge error:", error);
    process.exit(1);
  });

  bridge.on("exit", (code, signal) => {
    console.error(`Bridge exited with code ${code} and signal ${signal}`);
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    console.error("Received SIGTERM, shutting down bridge...");
    bridge.kill("SIGTERM");
  });

  process.on("SIGINT", () => {
    console.error("Received SIGINT, shutting down bridge...");
    bridge.kill("SIGINT");
  });
}

// Start the bridge
startBridge();
