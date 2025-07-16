#!/usr/bin/env node

/**
 * Smart Database Reset Script
 * Automatically backs up essential data before reset and restores after
 */

import { spawn } from "child_process";
import { backupEssentialData, restoreEssentialData } from "./backup-restore.js";

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

async function smartReset() {
  console.log("🔄 Starting smart database reset...");

  try {
    // Step 1: Backup essential data
    console.log("\n📦 Step 1: Backing up essential data...");
    await backupEssentialData();

    // Step 2: Reset the database
    console.log("\n🗑️  Step 2: Resetting database...");
    await runCommand("npx", ["prisma", "migrate", "reset", "--force"]);

    // Step 3: Restore essential data
    console.log("\n🔄 Step 3: Restoring essential data...");
    await restoreEssentialData();

    console.log("\n✅ Smart reset completed successfully!");
    console.log(
      "Your database has been reset but your users, organizations, and memberships are preserved."
    );
  } catch (error) {
    console.error("\n❌ Smart reset failed:", error);
    console.log("\n🚨 Your database may be in an inconsistent state.");
    console.log("You can try to restore manually with: pnpm db:restore");
    process.exit(1);
  }
}

// Run the smart reset
smartReset().catch(console.error);
