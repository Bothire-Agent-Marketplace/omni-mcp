import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RemoveOptions {
  force?: boolean;
  keepSchemas?: boolean;
}

export async function removeMcpServer(
  serviceName: string,
  options: RemoveOptions
) {
  console.log(`🗑️  Removing ${serviceName} MCP server...`);

  const projectRoot = path.resolve(__dirname, "../../../../..");
  const serverPath = path.join(
    projectRoot,
    "servers",
    `${serviceName}-mcp-server`
  );
  const schemasPath = path.join(
    projectRoot,
    "shared",
    "schemas",
    "src",
    serviceName
  );

  // Check if server exists
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ MCP server '${serviceName}' not found at ${serverPath}`);
    process.exit(1);
  }

  // Confirmation unless forced
  if (!options.force) {
    console.log("⚠️  This will permanently delete:");
    console.log(`   📂 servers/${serviceName}-mcp-server/`);
    if (fs.existsSync(schemasPath) && !options.keepSchemas) {
      console.log(`   📂 shared/schemas/src/${serviceName}/`);
    }
    console.log("");

    // In a real CLI, you'd want to use a proper prompt library
    console.log("❌ Operation cancelled - use --force to confirm removal");
    console.log("   Example: omni remove github --force");
    return;
  }

  try {
    // Remove server directory
    if (fs.existsSync(serverPath)) {
      fs.rmSync(serverPath, { recursive: true, force: true });
      console.log(`✅ Removed server: servers/${serviceName}-mcp-server/`);
    }

    // Remove schemas unless keeping them
    if (!options.keepSchemas && fs.existsSync(schemasPath)) {
      fs.rmSync(schemasPath, { recursive: true, force: true });
      console.log(`✅ Removed schemas: shared/schemas/src/${serviceName}/`);

      // Update shared schemas index
      await updateSchemasIndex(serviceName, projectRoot);
    }

    // Remove from Docker configs if they exist
    await cleanupDockerConfigs(serviceName, projectRoot);

    console.log("");
    console.log("✅ MCP server removed successfully!");
    console.log("");
    console.log("🧹 Next steps:");
    console.log("   1. Update any Claude Desktop configurations");
    console.log("   2. Remove environment variables if no longer needed");
    console.log("   3. Run: pnpm install (to clean up dependencies)");
  } catch (error) {
    console.error("❌ Error removing MCP server:", error);
    process.exit(1);
  }
}

async function updateSchemasIndex(serviceName: string, projectRoot: string) {
  try {
    const indexPath = path.join(
      projectRoot,
      "shared",
      "schemas",
      "src",
      "index.ts"
    );
    if (!fs.existsSync(indexPath)) return;

    let indexContent = fs.readFileSync(indexPath, "utf8");

    // Remove the export line for this service
    const capitalizedName =
      serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    const exportLine = `export * from "./${serviceName}/mcp-types.js";`;
    const commentLine = `// ${capitalizedName}-specific types`;

    indexContent = indexContent
      .split("\n")
      .filter(
        (line) => !line.includes(exportLine) && !line.includes(commentLine)
      )
      .join("\n");

    // Clean up extra newlines
    indexContent = indexContent.replace(/\n\n\n+/g, "\n\n");

    fs.writeFileSync(indexPath, indexContent);
    console.log("✅ Updated shared schemas index");
  } catch (error) {
    console.log("⚠️  Could not update schemas index:", error);
  }
}

async function cleanupDockerConfigs(serviceName: string, projectRoot: string) {
  const dockerComposeFiles = ["docker-compose.yml", "docker-compose.dev.yml"];

  for (const fileName of dockerComposeFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) continue;

    try {
      let content = fs.readFileSync(filePath, "utf8");

      // Check if this service is referenced
      const serviceName_container = `omni-${serviceName}-mcp-server`;
      if (content.includes(serviceName_container)) {
        console.log(
          `⚠️  Service '${serviceName_container}' found in ${fileName}`
        );
        console.log(
          "   Manual cleanup may be required for Docker configuration"
        );
      }
    } catch (error) {
      // Ignore errors reading Docker files
    }
  }
}
