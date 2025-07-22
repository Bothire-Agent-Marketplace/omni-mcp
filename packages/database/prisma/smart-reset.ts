#!/usr/bin/env node

/**
 * Database Reset Script
 * Performs a clean database reset without backing up or restoring data
 */

import { spawn } from "child_process";

async function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: "inherit" });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}

async function resetDatabase() {
  console.log("🔄 Starting clean database reset...");

  try {
    // Reset the database completely
    console.log("\n🗑️  Resetting database...");
    await runCommand("npx", ["prisma", "migrate", "reset", "--force"]);

    console.log("\n✅ Database reset completed successfully!");
    console.log("Your database has been completely reset to a clean state.");
  } catch (error) {
    console.error("\n❌ Database reset failed:", error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase().catch(console.error);
