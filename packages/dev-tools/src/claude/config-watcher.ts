import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Central config file that serves as the source of truth
const sourcePath = path.resolve(
  __dirname,
  "../../../../client-integrations/claude-desktop/claude_desktop_config.json"
);

// Claude Desktop config location
const destPath = path.resolve(
  process.env.HOME!,
  "Library/Application Support/Claude/claude_desktop_config.json"
);

// Also watch our MCP servers config for changes
const mcpServersConfigPath = path.resolve(
  __dirname,
  "../../../utils/src/mcp-servers.json"
);

console.log("🔍 Claude Desktop Config Watcher");
console.log("================================");
console.log(`📂 Source: ${sourcePath}`);
console.log(`📂 MCP Config: ${mcpServersConfigPath}`);
console.log(`🎯 Destination: ${destPath}`);
console.log("");

// Ensure destination directory exists
const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  console.log(`📁 Creating destination directory: ${destDir}`);
  fs.mkdirSync(destDir, { recursive: true });
}

const copyFile = (reason: string = "change detected") => {
  try {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      return;
    }

    // Validate JSON before copying
    const configContent = fs.readFileSync(sourcePath, "utf8");
    JSON.parse(configContent); // This will throw if invalid JSON

    fs.copyFileSync(sourcePath, destPath);
    console.log(
      `✅ Config updated (${reason}) at ${new Date().toLocaleTimeString()}`
    );

    // Show brief config summary
    const config = JSON.parse(configContent);
    const serverCount = Object.keys(config.mcpServers || {}).length;
    console.log(`   📊 ${serverCount} MCP server(s) configured`);
  } catch (err) {
    const error = err as Error;
    console.error(`❌ Error updating config (${reason}):`, error.message);
  }
};

// Watch both the main config and MCP servers config
const watcher = chokidar.watch([sourcePath, mcpServersConfigPath], {
  persistent: true,
  ignoreInitial: false,
});

watcher
  .on("add", (filePath: string) => {
    const fileName = path.basename(filePath);
    copyFile(`${fileName} added`);
  })
  .on("change", (filePath: string) => {
    const fileName = path.basename(filePath);
    copyFile(`${fileName} changed`);
  })
  .on("error", (error: Error | unknown) => {
    console.error(`🚨 Watcher error: ${error}`);
  });

console.log("👀 Watching for changes... (Press Ctrl+C to stop)");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping config watcher...");
  watcher.close();
  process.exit(0);
});
