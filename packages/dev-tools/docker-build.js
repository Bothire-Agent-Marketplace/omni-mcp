const { execSync } = require("child_process");
const path = require("path");

// Get the root directory of the monorepo (two levels up from this script)
const MONOREPO_ROOT = path.resolve(__dirname, "../..");

// Configuration for all Docker builds
const dockerBuilds = [
  {
    name: "linear-mcp-server",
    context: MONOREPO_ROOT,
    dockerfile: path.join(
      MONOREPO_ROOT,
      "servers/linear-mcp-server/Dockerfile"
    ),
    tag: "mcp/linear:latest",
    description: "Custom Linear MCP Server",
  },
  // Add more builds here as you create new servers
];

function runCommand(command, description) {
  console.log(`🔨 ${description}...`);
  console.log(`   Command: ${command}`);

  try {
    const output = execSync(command, {
      stdio: "inherit",
      cwd: MONOREPO_ROOT, // Always run from monorepo root
    });
    console.log(`✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

function buildAllDockerImages() {
  console.log("🚀 Starting unified Docker build process...\n");
  console.log(`   Working directory: ${MONOREPO_ROOT}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const build of dockerBuilds) {
    const command = `docker build -f ${build.dockerfile} -t ${build.tag} ${build.context}`;
    const success = runCommand(
      command,
      `Building ${build.description} (${build.tag})`
    );

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log("📊 Build Summary:");
  console.log(`   ✅ Successful builds: ${successCount}`);
  console.log(`   ❌ Failed builds: ${failureCount}`);

  if (failureCount > 0) {
    console.log(
      "\n❌ Some Docker builds failed. Check the output above for details."
    );
    process.exit(1);
  } else {
    console.log("\n🎉 All Docker builds completed successfully!");
  }
}

// Run if called directly
if (require.main === module) {
  buildAllDockerImages();
}

module.exports = { buildAllDockerImages, dockerBuilds };
