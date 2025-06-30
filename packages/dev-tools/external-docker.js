const { execSync } = require("child_process");

// Configuration for external Docker images
const externalImages = [
  {
    name: "mcp-filesystem",
    image: "mcp/filesystem:latest",
    description: "MCP Filesystem Server",
  },
  {
    name: "database-toolbox",
    image: "us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:0.7.0",
    description: "Google MCP Database Toolbox",
  },
];

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  console.log(`   Command: ${command}`);

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log(`✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

function pullExternalImages() {
  console.log("📥 Pulling external Docker images...\n");

  let successCount = 0;
  let failureCount = 0;

  for (const image of externalImages) {
    const command = `docker pull ${image.image}`;
    const success = runCommand(
      command,
      `Pulling ${image.description} (${image.image})`
    );

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log("📊 Pull Summary:");
  console.log(`   ✅ Successful pulls: ${successCount}`);
  console.log(`   ❌ Failed pulls: ${failureCount}`);

  if (failureCount > 0) {
    console.log(
      "\n⚠️  Some external image pulls failed. Check the output above for details."
    );
    console.log(
      "   You may need to authenticate with the respective registries."
    );
  } else {
    console.log("\n🎉 All external images pulled successfully!");
  }
}

// Run if called directly
if (require.main === module) {
  pullExternalImages();
}

module.exports = { pullExternalImages, externalImages };
