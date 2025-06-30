import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ListOptions {
  verbose?: boolean;
}

export async function listMcpServers(options: ListOptions) {
  console.log("📋 Omni MCP Servers");
  console.log("===================");

  const projectRoot = path.resolve(__dirname, "../../../../..");
  const serversDir = path.join(projectRoot, "servers");

  if (!fs.existsSync(serversDir)) {
    console.log("❌ No servers directory found");
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
    console.log("📭 No MCP servers found");
    console.log("");
    console.log("💡 Create your first server with:");
    console.log("   omni create <service-name>");
    return;
  }

  console.log(
    `Found ${servers.length} MCP server${servers.length > 1 ? "s" : ""}:`
  );
  console.log("");

  for (const serverDir of servers) {
    const serviceName = serverDir.replace("-mcp-server", "");
    const serverPath = path.join(serversDir, serverDir);

    console.log(`🚀 ${serviceName}`);

    if (options.verbose) {
      await showServerDetails(serviceName, serverPath);
    }

    console.log("");
  }

  if (!options.verbose) {
    console.log("💡 Use --verbose for detailed information");
  }
}

async function showServerDetails(serviceName: string, serverPath: string) {
  try {
    // Read package.json
    const packageJsonPath = path.join(serverPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      console.log(
        `   📦 ${packageJson.version} - ${
          packageJson.description || "No description"
        }`
      );
    }

    // Check if built
    const distPath = path.join(serverPath, "dist");
    const isBuilt = fs.existsSync(distPath);
    console.log(`   🔨 Built: ${isBuilt ? "✅" : "❌"}`);

    // Check Docker
    const dockerfilePath = path.join(serverPath, "Dockerfile");
    const hasDocker = fs.existsSync(dockerfilePath);
    console.log(`   🐳 Docker: ${hasDocker ? "✅" : "❌"}`);

    // Check shared schemas
    const projectRoot = path.resolve(serverPath, "../..");
    const schemaPath = path.join(
      projectRoot,
      "shared",
      "schemas",
      "src",
      serviceName
    );
    const hasSchemas = fs.existsSync(schemaPath);
    console.log(`   📋 Schemas: ${hasSchemas ? "✅" : "❌"}`);

    // Count tools/resources/prompts
    const toolsPath = path.join(
      serverPath,
      "src",
      "mcp-server",
      "tools",
      `${serviceName}-tools.ts`
    );
    if (fs.existsSync(toolsPath)) {
      const toolsContent = fs.readFileSync(toolsPath, "utf8");
      const toolCount = (toolsContent.match(/async \w+/g) || []).length - 1; // -1 for _execute
      console.log(`   🛠️  Tools: ${toolCount}`);
    }

    // Check compliance
    const isCompliant = await checkCompliance(serviceName, serverPath);
    console.log(`   ✅ Enterprise Pattern: ${isCompliant ? "✅" : "❌"}`);

    console.log(`   📂 ${serverPath.replace(process.cwd() + "/", "")}`);
  } catch (error) {
    console.log("   ❌ Error reading server details");
  }
}

async function checkCompliance(
  serviceName: string,
  serverPath: string
): Promise<boolean> {
  try {
    // Check for shared type imports
    const toolsPath = path.join(serverPath, "src", "mcp-server", "tools.ts");
    if (!fs.existsSync(toolsPath)) return false;

    const toolsContent = fs.readFileSync(toolsPath, "utf8");
    const hasSharedImport = toolsContent.includes("@mcp/schemas");

    // Check for _execute pattern
    const toolsImplPath = path.join(
      serverPath,
      "src",
      "mcp-server",
      "tools",
      `${serviceName}-tools.ts`
    );
    if (!fs.existsSync(toolsImplPath)) return false;

    const toolsImplContent = fs.readFileSync(toolsImplPath, "utf8");
    const hasExecutePattern = toolsImplContent.includes("_execute");
    const hasSharedTypes = toolsImplContent.includes("McpResponse");

    return hasSharedImport && hasExecutePattern && hasSharedTypes;
  } catch {
    return false;
  }
}
