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

export function copyClaudeConfig(): boolean {
  try {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      return false;
    }

    // Validate JSON before copying
    const configContent = fs.readFileSync(sourcePath, "utf8");
    JSON.parse(configContent); // This will throw if invalid JSON

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      console.log(`📁 Creating destination directory: ${destDir}`);
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Claude Desktop config copied successfully`);
    console.log(`   📂 From: ${sourcePath}`);
    console.log(`   📂 To: ${destPath}`);

    // Show brief config summary
    const config = JSON.parse(configContent);
    const serverCount = Object.keys(config.mcpServers || {}).length;
    console.log(`   📊 ${serverCount} MCP server(s) configured`);

    return true;
  } catch (err) {
    const error = err as Error;
    console.error(`❌ Error copying Claude Desktop config:`, error.message);
    return false;
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  copyClaudeConfig();
}
