const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");

const sourcePath = path.resolve(
  __dirname,
  "../../client-integrations/claude-desktop/claude_desktop_config.local.json"
);
const destPath = path.resolve(
  process.env.HOME,
  "Library/Application Support/Claude/claude_desktop_config.json"
);

console.log(`Watching for changes on ${sourcePath}`);
console.log(`Changes will be copied to ${destPath}`);

const watcher = chokidar.watch(sourcePath, {
  persistent: true,
});

const copyFile = () => {
  fs.copyFile(sourcePath, destPath, (err) => {
    if (err) {
      console.error("Error copying file:", err);
      return;
    }
    console.log(
      `✅ Successfully copied config to ${destPath} at ${new Date().toLocaleTimeString()}`
    );
  });
};

watcher
  .on("add", copyFile)
  .on("change", copyFile)
  .on("error", (error) => console.error(`Watcher error: ${error}`));

// Initial copy on start
copyFile();
