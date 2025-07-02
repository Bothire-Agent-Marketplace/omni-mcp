import { Command } from "commander";
import prompts from "prompts";
import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { log, logError, logSuccess, logWarning, runCommand } from "../utils.js";

export const remove = new Command("remove")
  .description("🗑️  Remove an MCP server from the project")
  .argument("<service-name>", "Name of the service to remove (e.g., 'linear')")
  .option("-f, --force", "Force removal without confirmation")
  .action(async (serviceName, options) => {
    const serverId = `${serviceName}-mcp-server`;
    const serverPath = path.resolve(process.cwd(), "apps", serverId);

    log(`🗑️  Attempting to remove ${serviceName} MCP server...`);

    if (!fs.existsSync(serverPath)) {
      logError(`❌ MCP server '${serviceName}' not found at ${serverPath}`);
      return;
    }

    if (!options.force) {
      const confirmation = await prompts({
        type: "confirm",
        name: "value",
        message: `This will permanently delete the directory '${serverPath}' and update workspace configurations. Are you sure?`,
        initial: false,
      });

      if (!confirmation.value) {
        log("Operation cancelled.");
        return;
      }
    }

    try {
      // 1. Remove from MCP servers JSON configuration
      await updateMCPServersJson(serviceName);

      // 2. Remove the server directory
      await fs.remove(serverPath);
      log(`✅ Removed directory: ${serverPath}`);

      // 3. Run pnpm install to update workspace
      log("📦 Running pnpm install to update workspace...");
      await runCommand("pnpm", ["install"], { stdio: "inherit" });

      logSuccess(`\n🎉 MCP server '${serviceName}' removed successfully!`);
      logWarning(
        "\n🧹 Don't forget to remove any related secrets from 'secrets/.env.development.local'."
      );
    } catch (error) {
      logError(
        `An error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });

async function updateMCPServersJson(serviceName: string) {
  const configPath = path.resolve(
    process.cwd(),
    "packages/utils/src/mcp-servers.json"
  );

  try {
    if (!fs.existsSync(configPath)) {
      logWarning(`MCP servers config not found at ${configPath}. Skipping.`);
      return;
    }

    const content = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(content);

    if (config[serviceName]) {
      delete config[serviceName];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      log(
        `✅ Removed '${serviceName}' from packages/utils/src/mcp-servers.json`
      );
    } else {
      logWarning(
        `Server '${serviceName}' not found in mcp-servers.json. Skipping.`
      );
    }
  } catch (error) {
    logError(`Could not update mcp-servers.json: ${error}`);
  }
}
