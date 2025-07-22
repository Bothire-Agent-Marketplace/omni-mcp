#!/usr/bin/env node

import { spawn } from "child_process";
import { platform } from "os";

/**
 * Development cleanup script
 * Kills hanging processes and frees up ports
 */

// Common development ports used by the platform
const COMMON_PORTS = [
  3000, // mcp-admin (Next.js)
  3001, // Gateway
  3002, // Linear Server
  3003, // Perplexity Server
  3003, // DevTools Server
  5555, // Prisma Studio
  37373, // Gateway (production port)
];

// Process names to kill
const PROCESS_NAMES = [
  "tsx",
  "node",
  "next-server",
  "prisma",
  "turbo",
  "concurrently",
  "ngrok",
];

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const isWindows = platform() === "win32";

    if (isWindows) {
      // Windows: Use netstat and taskkill
      const findCmd = spawn("netstat", ["-ano"]);
      let output = "";

      findCmd.stdout.on("data", (data) => {
        output += data.toString();
      });

      findCmd.on("close", () => {
        const lines = output.split("\n");
        const portLine = lines.find((line) => line.includes(`:${port} `));

        if (portLine) {
          const pid = portLine.trim().split(/\s+/).pop();
          if (pid && pid !== "0") {
            console.log(`🔪 Killing process ${pid} on port ${port}`);
            spawn("taskkill", ["/PID", pid, "/F"]);
          }
        }
        resolve();
      });
    } else {
      // Unix/Linux/macOS: Use lsof and kill
      const lsofCmd = spawn("lsof", ["-ti", `tcp:${port}`]);
      let pid = "";

      lsofCmd.stdout.on("data", (data) => {
        pid += data.toString().trim();
      });

      lsofCmd.on("close", (code) => {
        if (code === 0 && pid) {
          console.log(`🔪 Killing process ${pid} on port ${port}`);
          spawn("kill", ["-9", pid]);
        }
        resolve();
      });

      lsofCmd.on("error", () => {
        resolve(); // lsof might not be available
      });
    }
  });
}

function killProcessByName(name) {
  return new Promise((resolve) => {
    const isWindows = platform() === "win32";

    if (isWindows) {
      spawn("taskkill", ["/IM", `${name}.exe`, "/F"]);
    } else {
      spawn("pkill", ["-f", name]);
    }

    setTimeout(resolve, 100);
  });
}

async function cleanup() {
  console.log("🧹 Starting development cleanup...");

  // Kill processes by name
  console.log("🔪 Killing hanging processes...");
  for (const name of PROCESS_NAMES) {
    await killProcessByName(name);
  }

  // Kill processes on common ports
  console.log("🔌 Freeing up ports...");
  for (const port of COMMON_PORTS) {
    await killProcessOnPort(port);
  }

  // Wait a bit for processes to die
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("✅ Cleanup complete! You can now run pnpm dev");
}

// Handle script arguments
const args = process.argv.slice(2);
const shouldCleanup = args.includes("--cleanup") || args.includes("-c");

if (shouldCleanup) {
  cleanup().catch(console.error);
} else {
  console.log("Usage: node scripts/dev-cleanup.js --cleanup");
  console.log("This will kill hanging development processes and free up ports");
}
