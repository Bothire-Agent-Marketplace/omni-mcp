#!/usr/bin/env node

import { spawn, execSync } from "child_process";
import { platform } from "os";

/**
 * Better development startup script
 * Handles graceful shutdown and better terminal management
 */

const services = [
  {
    name: "🚀 SERVERS",
    command: "pnpm",
    args: ["turbo", "dev"],
    color: "\x1b[44m\x1b[1m", // Blue background, bold
    env: { ...process.env, FORCE_COLOR: "1" },
  },
  {
    name: "📊 STUDIO",
    command: "pnpm",
    args: ["db:studio"],
    color: "\x1b[42m\x1b[1m", // Green background, bold
    env: { ...process.env, FORCE_COLOR: "1" },
  },
  {
    name: "🌐 NGROK",
    command: "ngrok",
    args: ["start", "mcp-admin-webhook", "--config", "ngrok.yml"],
    color: "\x1b[43m\x1b[1m", // Yellow background, bold
    env: { ...process.env, FORCE_COLOR: "1" },
  },
  {
    name: "🔗 TUNNEL",
    command: "lt",
    args: ["--port", "3000"],
    color: "\x1b[45m\x1b[1m", // Magenta background, bold
    env: { ...process.env, FORCE_COLOR: "1" },
    openUrl: true, // Special flag to auto-open URLs
  },
];

const processes = [];
const resetColor = "\x1b[0m";

function colorize(text, color) {
  return `${color}${text}${resetColor}`;
}

function openUrl(url) {
  try {
    const command =
      platform() === "darwin"
        ? `open "${url}"`
        : platform() === "win32"
          ? `start "${url}"`
          : `xdg-open "${url}"`;

    execSync(command);
    console.log(`🌍 Opened URL in browser: ${url}`);
  } catch {
    console.log(`🌍 URL available: ${url} (could not auto-open)`);
  }
}

function startService(service) {
  console.log(`Starting ${service.name}...`);

  const proc = spawn(service.command, service.args, {
    stdio: "pipe",
    env: service.env,
    shell: true,
  });

  proc.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      console.log(`${colorize(`[${service.name}]`, service.color)} ${line}`);

      // Auto-open URLs for services that have openUrl flag
      if (service.openUrl) {
        // Match localtunnel URLs (https://xyz.loca.lt)
        const urlMatch = line.match(/https:\/\/[a-z0-9]+\.loca\.lt/i);
        if (urlMatch) {
          const url = urlMatch[0];
          setTimeout(() => openUrl(url), 1000); // Delay to let service start
        }
      }
    });
  });

  proc.stderr.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      console.error(`${colorize(`[${service.name}]`, service.color)} ${line}`);
    });
  });

  proc.on("close", (code) => {
    if (code !== 0) {
      console.error(
        `${colorize(`[${service.name}]`, service.color)} Process exited with code ${code}`
      );
    }
  });

  proc.on("error", (err) => {
    console.error(
      `${colorize(`[${service.name}]`, service.color)} Error: ${err.message}`
    );
  });

  return proc;
}

function gracefulShutdown() {
  console.log("\n🛑 Shutting down development services...");

  processes.forEach((proc, index) => {
    if (proc && !proc.killed) {
      const service = services[index];
      console.log(`Stopping ${service.name}...`);

      if (platform() === "win32") {
        spawn("taskkill", ["/PID", proc.pid, "/T", "/F"]);
      } else {
        proc.kill("SIGTERM");

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill("SIGKILL");
          }
        }, 5000);
      }
    }
  });

  setTimeout(() => {
    console.log("✅ All services stopped");
    process.exit(0);
  }, 2000);
}

// Handle different signal types
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGQUIT", gracefulShutdown);

// Handle Windows Ctrl+C
if (platform() === "win32") {
  const readlineInterface = await import("readline");
  const rl = readlineInterface.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("SIGINT", gracefulShutdown);
}

// Start all services
console.log("🚀 Starting development environment...");
console.log("Press Ctrl+C to stop all services gracefully\n");

services.forEach((service) => {
  const proc = startService(service);
  processes.push(proc);
});

// Keep the process alive
process.stdin.resume();
