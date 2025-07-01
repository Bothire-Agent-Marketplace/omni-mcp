import { exec } from "child_process";
import chalk from "chalk";

export function log(message: string) {
  console.log(message);
}

export function logSuccess(message: string) {
  console.log(chalk.green(message));
}

export function logError(message: string) {
  console.error(chalk.red(message));
}

export function logWarning(message: string) {
  console.warn(chalk.yellow(message));
}

export function runCommand(
  command: string,
  args: string[],
  options: { stdio?: "inherit" | "pipe" } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = exec(`${command} ${args.join(" ")}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      if (stderr && options.stdio !== "inherit") {
        logWarning(stderr);
      }
      if (stdout && options.stdio !== "inherit") {
        log(stdout);
      }
      resolve();
    });

    if (options.stdio === "inherit") {
      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    }
  });
}

export async function getJson(filePath: string): Promise<any> {
  const fs = await import("fs-extra");
  return fs.readJson(filePath);
}

export async function writeJson(filePath: string, data: any): Promise<void> {
  const fs = await import("fs-extra");
  await fs.writeJson(filePath, data, { spaces: 2 });
}

// The 'validate' function was removed as it's now part of the validate command itself.
// This file should only contain generic, shared utilities.
