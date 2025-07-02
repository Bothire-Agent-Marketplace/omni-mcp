import fs from "fs";
import path from "path";
import { Command } from "commander";
import { log, logError, logWarning } from "../utils.js";

export const list = new Command("list")
  .description("📋 List all MCP servers in the project")
  .option("-v, --verbose", "Show detailed information")
  .action(async (options) => {
    log("📋 Omni MCP Servers");
    log("===================");

    const serversDir = path.resolve(process.cwd(), "apps");

    if (!fs.existsSync(serversDir)) {
      logError("❌ No apps directory found at ./apps");
      return;
    }

    const servers = fs
      .readdirSync(serversDir)
      .filter((name) => name.endsWith("-mcp-server"))
      .filter((name) => {
        const serverPath = path.join(serversDir, name);
        return fs.statSync(serverPath).isDirectory();
      });

    if (servers.length === 0) {
      log("📭 No MCP servers found.");
      logWarning("\n💡 Create your first server with: omni create");
      return;
    }

    log(
      `Found ${servers.length} MCP server${servers.length > 1 ? "s" : ""}:\n`
    );

    for (const serverDir of servers) {
      const serviceName = serverDir.replace("-mcp-server", "");
      log(`🚀 ${serviceName}`);

      if (options.verbose) {
        const serverPath = path.join(serversDir, serverDir);
        await showServerDetails(serverPath);
      }
    }

    if (!options.verbose) {
      log("\n💡 Use --verbose for detailed information.");
    }
  });

async function showServerDetails(serverPath: string) {
  try {
    const packageJsonPath = path.join(serverPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      log(
        `   📦 ${packageJson.version} - ${
          packageJson.description || "No description"
        }`
      );
    }

    const distPath = path.join(serverPath, "dist");
    log(`   🔨 Built: ${fs.existsSync(distPath) ? "✅" : "❌"}`);

    const dockerfilePath = path.join(serverPath, "Dockerfile");
    log(`   🐳 Docker: ${fs.existsSync(dockerfilePath) ? "✅" : "❌"}`);

    log(`   📂 ${path.relative(process.cwd(), serverPath)}`);
    console.log("");
  } catch (error) {
    logError(`   ❌ Error reading details for ${path.basename(serverPath)}`);
  }
}
