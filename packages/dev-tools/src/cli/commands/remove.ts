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
    const serverPath = path.resolve(process.cwd(), "servers", serverId);

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
      // 1. Remove from docker-compose.dev.yml
      await updateDockerCompose(serviceName, serverId);

      // 2. Remove from pnpm-workspace.yaml
      await updatePnpmWorkspace(`servers/${serverId}`);

      // 3. Remove from gateway master config
      await updateMasterConfig(serviceName);

      // 4. Remove the server directory
      await fs.remove(serverPath);
      log(`✅ Removed directory: ${serverPath}`);

      // 5. Run pnpm install to update lockfile
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

async function updateDockerCompose(serviceName: string, serverId: string) {
  const composePath = "deployment/docker-compose.dev.yml";
  try {
    const composeConfig = yaml.load(
      fs.readFileSync(composePath, "utf8")
    ) as any;
    if (composeConfig.services && composeConfig.services[serverId]) {
      delete composeConfig.services[serverId];

      // Remove from gateway's depends_on
      if (composeConfig.services["mcp-gateway"]?.depends_on) {
        composeConfig.services["mcp-gateway"].depends_on =
          composeConfig.services["mcp-gateway"].depends_on.filter(
            (dep: string) => dep !== serverId
          );
      }

      fs.writeFileSync(
        composePath,
        yaml.dump(composeConfig, { indent: 2, lineWidth: -1 })
      );
      log(`✅ Removed '${serverId}' service from ${composePath}`);
    } else {
      logWarning(
        `Service '${serverId}' not found in ${composePath}. Skipping.`
      );
    }
  } catch (error) {
    logError(`Could not update ${composePath}: ${error}`);
  }
}

async function updatePnpmWorkspace(serverPath: string) {
  const workspacePath = "pnpm-workspace.yaml";
  try {
    const workspaceConfig = yaml.load(
      fs.readFileSync(workspacePath, "utf8")
    ) as { packages: string[] };
    if (workspaceConfig.packages?.includes(serverPath)) {
      workspaceConfig.packages = workspaceConfig.packages.filter(
        (p) => p !== serverPath
      );
      fs.writeFileSync(workspacePath, yaml.dump(workspaceConfig));
      log(`✅ Removed '${serverPath}' from ${workspacePath}`);
    } else {
      logWarning(
        `Path '${serverPath}' not found in ${workspacePath}. Skipping.`
      );
    }
  } catch (error) {
    logError(`Could not update ${workspacePath}: ${error}`);
  }
}

async function updateMasterConfig(serviceName: string) {
  const configPath = "gateway/master.config.dev.json";
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.servers && config.servers[serviceName]) {
      delete config.servers[serviceName];
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(`✅ Removed '${serviceName}' server from ${configPath}`);
    } else {
      logWarning(
        `Server '${serviceName}' not found in ${configPath}. Skipping.`
      );
    }
  } catch (error) {
    logError(`Could not update ${configPath}: ${error}`);
  }
}
