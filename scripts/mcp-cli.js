#!/usr/bin/env node

/**
 * MCP Server Management CLI
 * Manages MCP servers in the monorepo with add/list/remove operations
 */

import { execSync } from "child_process";
import {
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
  cpSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const command = process.argv[2];
const serverName = process.argv[3];

// CLI Commands
const commands = {
  add: addServer,
  list: listServers,
  remove: removeServer,
  delete: removeServer, // Alias for remove
  help: showHelp,
};

// Main CLI entry point
async function main() {
  if (!command || !commands[command]) {
    showHelp();
    process.exit(1);
  }

  try {
    await commands[command](serverName);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// ============================================================================
// ADD SERVER
// ============================================================================

function addServer(domain) {
  if (!domain) {
    throw new Error("Server domain name is required. Usage: mcp add <domain>");
  }

  if (!domain.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error(
      "Domain must be lowercase alphanumeric with hyphens (e.g., github, slack-bot)"
    );
  }

  const serverDir = join(rootDir, "apps", `${domain}-mcp-server`);

  if (existsSync(serverDir)) {
    throw new Error(`Server "${domain}" already exists at ${serverDir}`);
  }

  console.log(`🚀 Creating new MCP server: ${domain}`);

  // Step 1: Copy template from linear-mcp-server
  console.log("📁 Copying template files...");
  const templateDir = join(rootDir, "apps", "linear-mcp-server");
  cpSync(templateDir, serverDir, {
    recursive: true,
    filter: (src) => !src.includes("node_modules") && !src.includes("dist"),
  });

  // Step 2: Update package.json
  console.log("📦 Updating package.json...");
  updatePackageJson(serverDir, domain);

  // Step 3: Replace file contents
  console.log("🔄 Updating source files...");
  replaceFileContents(serverDir, domain);

  // Step 4: Create input schemas
  console.log("📋 Creating input schemas...");
  createInputSchemas(domain);

  // Step 5: Register in capabilities
  console.log("🔗 Registering server capabilities...");
  registerInCapabilities(domain);

  // Step 6: Update configuration files
  console.log("⚙️  Updating configuration files...");
  updateConfigurationFiles(domain);

  // Step 7: Install dependencies
  console.log("⬇️  Installing dependencies...");
  execSync("pnpm install", { cwd: rootDir, stdio: "inherit" });

  console.log(`✅ Successfully created ${domain} MCP server!`);
  console.log(`\n📍 Next steps:`);
  console.log(`   1. cd apps/${domain}-mcp-server`);
  console.log(
    `   2. Update src/types/domain-types.ts with ${domain}-specific types`
  );
  console.log(
    `   3. Update src/schemas/domain-schemas.ts with ${domain} validation`
  );
  console.log(`   4. Implement handlers in src/mcp-server/handlers.ts`);
  console.log(`   5. Define tools in src/mcp-server/tools.ts`);
  console.log(
    `   6. Add ${domain.toUpperCase()}_API_KEY to secrets/.env.development.local`
  );
  console.log(
    `   7. Start development: pnpm --filter @mcp/${domain}-server dev`
  );
}

function updatePackageJson(serverDir, domain) {
  const packagePath = join(serverDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

  // Update package details
  packageJson.name = `@mcp/${domain}-server`;
  packageJson.description = `${capitalize(domain)} MCP Server with TypeScript and Zod validation`;
  packageJson.keywords = packageJson.keywords.map((k) =>
    k === "linear" ? domain : k
  );

  // Update domain-specific dependencies (placeholder for now)
  // Real implementation would prompt for or detect required SDKs
  // packageJson.dependencies[`@${domain}/sdk`] = "^1.0.0";

  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}

function replaceFileContents(serverDir, domain) {
  const filesToUpdate = [
    "src/types/domain-types.ts",
    "src/schemas/domain-schemas.ts",
    "src/mcp-server/handlers.ts",
    "src/config/config.ts",
    "src/index.ts",
    "src/mcp-server/http-server.ts",
    "src/mcp-server/tools.ts",
    "src/mcp-server/resources.ts",
    "src/mcp-server/prompts.ts",
    "src/mcp-server/prompts-registry.ts",
    ".env.example",
  ];

  filesToUpdate.forEach((relativeFile) => {
    const filePath = join(serverDir, relativeFile);
    if (existsSync(filePath)) {
      let content = readFileSync(filePath, "utf8");

      // Replace Linear-specific content with domain placeholders
      content = content
        .replace(/Linear/g, capitalize(domain))
        .replace(/linear/g, domain.toLowerCase())
        .replace(/LINEAR/g, domain.toUpperCase())
        // Add more specific replacements as needed
        .replace(/@linear\/sdk/g, `@${domain}/sdk`) // Placeholder
        .replace(/Linear API/g, `${capitalize(domain)} API`)
        // Environment variable replacements
        .replace(/LINEAR_API_KEY/g, `${domain.toUpperCase()}_API_KEY`)
        .replace(/LINEAR_SERVER_PORT/g, `${domain.toUpperCase()}_SERVER_PORT`)
        .replace(/LINEAR_SERVER_URL/g, `${domain.toUpperCase()}_SERVER_URL`)
        // Config interface replacements
        .replace(/LinearServerConfig/g, `${capitalize(domain)}ServerConfig`)
        .replace(/linearServerConfig/g, `${domain.toLowerCase()}ServerConfig`)
        .replace(/linearApiKey/g, `${domain.toLowerCase()}ApiKey`)
        // Logger naming
        .replace(/linear-mcp-server/g, `${domain}-mcp-server`)
        .replace(/linear-http-server/g, `${domain}-http-server`);

      writeFileSync(filePath, content);
    }
  });
}

function updateConfigurationFiles(domain) {
  // Update turbo.json to include new environment variables
  const turboJsonPath = join(rootDir, "turbo.json");
  if (existsSync(turboJsonPath)) {
    let turboContent = readFileSync(turboJsonPath, "utf8");
    const turbo = JSON.parse(turboContent);

    // Add environment variables if they don't exist
    const newEnvVars = [
      `${domain.toUpperCase()}_API_KEY`,
      `${domain.toUpperCase()}_SERVER_URL`,
    ];

    if (turbo.globalEnv && Array.isArray(turbo.globalEnv)) {
      newEnvVars.forEach((envVar) => {
        if (!turbo.globalEnv.includes(envVar)) {
          turbo.globalEnv.push(envVar);
        }
      });
      writeFileSync(turboJsonPath, JSON.stringify(turbo, null, 2));
    }
  }

  // Update gateway tsconfig.json to reference new server
  const gatewayTsconfigPath = join(rootDir, "apps", "gateway", "tsconfig.json");
  if (existsSync(gatewayTsconfigPath)) {
    let gatewayTsconfig = readFileSync(gatewayTsconfigPath, "utf8");
    const tsconfig = JSON.parse(gatewayTsconfig);

    // Add reference to new server
    const newReference = { path: `../${domain}-mcp-server` };
    if (tsconfig.references && Array.isArray(tsconfig.references)) {
      const alreadyExists = tsconfig.references.some(
        (ref) => ref.path === `../${domain}-mcp-server`
      );
      if (!alreadyExists) {
        tsconfig.references.push(newReference);
        writeFileSync(gatewayTsconfigPath, JSON.stringify(tsconfig, null, 2));
      }
    }
  }

  // Update secrets/.env.development.local.example
  const secretsExamplePath = join(
    rootDir,
    "secrets",
    ".env.development.local.example"
  );
  if (existsSync(secretsExamplePath)) {
    let secretsContent = readFileSync(secretsExamplePath, "utf8");
    const newApiKeyLine = `${domain.toUpperCase()}_API_KEY=your-${domain}-api-key`;

    if (!secretsContent.includes(`${domain.toUpperCase()}_API_KEY`)) {
      secretsContent += `\n${newApiKeyLine}`;
      writeFileSync(secretsExamplePath, secretsContent);
    }
  }

  // Update .gitignore patterns
  const gitignorePath = join(rootDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    let gitignoreContent = readFileSync(gitignorePath, "utf8");
    const newPattern = `.env.${domain}.local`;

    if (!gitignoreContent.includes(newPattern)) {
      // Add after the linear pattern
      gitignoreContent = gitignoreContent.replace(
        ".env.linear.local",
        `.env.linear.local\n${newPattern}`
      );
      writeFileSync(gitignorePath, gitignoreContent);
    }
  }

  console.log(`   ✅ Updated turbo.json environment variables`);
  console.log(`   ✅ Updated gateway tsconfig.json references`);
  console.log(`   ✅ Updated secrets example file`);
  console.log(`   ✅ Updated .gitignore patterns`);
}

function createInputSchemas(domain) {
  const schemaDir = join(
    rootDir,
    "packages",
    "schemas",
    "src",
    "mcp",
    "input-schemas"
  );
  const schemaFile = join(schemaDir, `${domain}.ts`);

  // Create domain-specific input schema file
  const schemaContent = `import { ToolInputSchema } from "./types.js";
import { CommonInputSchemas } from "./common.js";

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Input Schemas
// ============================================================================

export const ${capitalize(domain)}InputSchemas = {
  // TODO: Add your ${domain}-specific input schemas here
  // Example:
  // searchItems: {
  //   type: "object",
  //   properties: {
  //     query: {
  //       type: "string",
  //       description: "Search query for ${domain} items",
  //     },
  //     limit: CommonInputSchemas.optionalLimit,
  //   },
  //   required: ["query"],
  //   additionalProperties: false,
  // } as ToolInputSchema,
} as const;
`;

  writeFileSync(schemaFile, schemaContent);

  // Update index.ts to export new schemas
  const indexFile = join(schemaDir, "index.ts");
  let indexContent = readFileSync(indexFile, "utf8");

  // Add export before the TODO comments
  const exportLine = `export * from "./${domain}.js";`;
  if (!indexContent.includes(exportLine)) {
    indexContent = indexContent.replace(
      "// TODO: Add exports for future server schemas",
      `export * from "./${domain}.js";\n\n// TODO: Add exports for future server schemas`
    );
    writeFileSync(indexFile, indexContent);
  }
}

function registerInCapabilities(domain) {
  // Step 1: Create server definition file
  const serverFile = join(
    rootDir,
    "packages",
    "capabilities",
    "src",
    "servers",
    `${domain}.ts`
  );

  const serverContent = `import { MCPServerSchema, type MCPServerDefinition } from "../types.js";

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Definition
// ============================================================================

export const ${domain.toUpperCase()}_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "${domain}",
  port: ${getNextAvailablePort()},
  description: "${capitalize(domain)} MCP Server for [TODO: add description]",
  productionUrl: "https://${domain}-mcp.vercel.app",
  envVar: "${domain.toUpperCase()}_SERVER_URL",
  tools: [
    // TODO: Add your ${domain} tools here
    // "${domain}_search_items",
  ],
  resources: [
    // TODO: Add your ${domain} resources here  
    // "${domain}://items",
  ],
  prompts: [
    // TODO: Add your ${domain} prompts here
    // "${domain}_workflow",
  ],
});
`;

  writeFileSync(serverFile, serverContent);

  // Step 2: Add export to servers/index.ts
  const serversIndexFile = join(
    rootDir,
    "packages",
    "capabilities",
    "src",
    "servers",
    "index.ts"
  );
  let serversIndexContent = readFileSync(serversIndexFile, "utf8");

  const exportLine = `export * from "./${domain}.js";`;
  if (!serversIndexContent.includes(exportLine)) {
    serversIndexContent = serversIndexContent.replace(
      "// TODO: Add exports for future servers",
      `export * from "./${domain}.js";\n\n// TODO: Add exports for future servers`
    );
    writeFileSync(serversIndexFile, serversIndexContent);
  }

  // Step 3: Add registration to main index.ts
  const mainIndexFile = join(
    rootDir,
    "packages",
    "capabilities",
    "src",
    "index.ts"
  );
  let mainIndexContent = readFileSync(mainIndexFile, "utf8");

  // Add import and registration
  if (!mainIndexContent.includes(`${domain.toUpperCase()}_SERVER`)) {
    mainIndexContent = mainIndexContent.replace(
      'import { LINEAR_SERVER } from "./servers/index.js";',
      `import { LINEAR_SERVER, ${domain.toUpperCase()}_SERVER } from "./servers/index.js";`
    );

    // Add registration
    mainIndexContent = mainIndexContent.replace(
      "// TODO: Add future server registrations",
      `serverRegistry.register(${domain.toUpperCase()}_SERVER);\n// TODO: Add future server registrations`
    );

    writeFileSync(mainIndexFile, mainIndexContent);
  }
}

// ============================================================================
// LIST SERVERS
// ============================================================================

async function listServers() {
  console.log("📋 Registered MCP Servers:\n");

  try {
    // Build the capabilities package first to ensure compiled output exists
    try {
      execSync("pnpm build --filter=@mcp/capabilities", {
        cwd: rootDir,
        stdio: "pipe",
      });
    } catch {
      // If build fails, fall back to showing available server directories
      console.log("   Build required. Showing available server directories...");
      const appsDir = join(rootDir, "apps");
      const serverDirs = readdirSync(appsDir).filter(
        (dir) =>
          dir.endsWith("-mcp-server") &&
          existsSync(join(appsDir, dir, "package.json"))
      );

      serverDirs.forEach((dir) => {
        const serverName = dir.replace("-mcp-server", "");
        console.log(`📁 ${serverName.toUpperCase()} (${dir})`);
      });

      console.log(`\n📊 Total: ${serverDirs.length} servers found`);
      console.log('   Run "pnpm build" first for detailed server information.');
      return;
    }

    // Import from compiled output
    const { default: serverRegistry } = await import(
      join(rootDir, "packages", "capabilities", "dist", "index.js")
    );
    const servers = serverRegistry.getAllServers();

    if (Object.keys(servers).length === 0) {
      console.log("   No servers registered yet.");
      return;
    }

    for (const [name, server] of Object.entries(servers)) {
      console.log(`🔧 ${name.toUpperCase()} (${server.description})`);
      console.log(`   Port: ${server.port}`);
      console.log(`   Production URL: ${server.productionUrl}`);
      console.log(`   Environment Variable: ${server.envVar}`);

      if (server.tools.length > 0) {
        console.log(`   Tools: ${server.tools.join(", ")}`);
      }

      if (server.resources.length > 0) {
        console.log(`   Resources: ${server.resources.join(", ")}`);
      }

      if (server.prompts.length > 0) {
        console.log(`   Prompts: ${server.prompts.join(", ")}`);
      }

      console.log();
    }

    console.log(`📊 Total: ${Object.keys(servers).length} servers registered`);
  } catch (error) {
    console.log("   No servers found or build required.");
    console.log(`   Error: ${error.message}`);
    console.log('   Run "pnpm build" first if you see this message.');
  }
}

// ============================================================================
// REMOVE SERVER
// ============================================================================

function removeServer(domain) {
  if (!domain) {
    throw new Error(
      "Server domain name is required. Usage: mcp remove <domain>"
    );
  }

  const serverDir = join(rootDir, "apps", `${domain}-mcp-server`);

  if (!existsSync(serverDir)) {
    throw new Error(`Server "${domain}" does not exist at ${serverDir}`);
  }

  console.log(`🗑️  Removing MCP server: ${domain}`);

  // Step 1: Remove server directory
  console.log("📁 Removing server directory...");
  rmSync(serverDir, { recursive: true, force: true });

  // Step 2: Remove input schemas
  console.log("📋 Removing input schemas...");
  removeInputSchemas(domain);

  // Step 3: Remove from capabilities
  console.log("🔗 Removing from capabilities...");
  removeFromCapabilities(domain);

  // Step 4: Clean dependencies
  console.log("🧹 Cleaning dependencies...");
  execSync("pnpm install", { cwd: rootDir, stdio: "inherit" });

  console.log(`✅ Successfully removed ${domain} MCP server!`);
}

function removeInputSchemas(domain) {
  const schemaFile = join(
    rootDir,
    "packages",
    "schemas",
    "src",
    "mcp",
    "input-schemas",
    `${domain}.ts`
  );

  if (existsSync(schemaFile)) {
    rmSync(schemaFile);
  }

  // Remove export from index.ts
  const indexFile = join(
    rootDir,
    "packages",
    "schemas",
    "src",
    "mcp",
    "input-schemas",
    "index.ts"
  );
  if (existsSync(indexFile)) {
    let content = readFileSync(indexFile, "utf8");
    content = content.replace(`export * from "./${domain}.js";\n`, "");
    writeFileSync(indexFile, content);
  }
}

function removeFromCapabilities(domain) {
  // Step 1: Remove server definition file
  const serverFile = join(
    rootDir,
    "packages",
    "capabilities",
    "src",
    "servers",
    `${domain}.ts`
  );

  if (existsSync(serverFile)) {
    rmSync(serverFile);
  }

  // Step 2: Remove export from servers/index.ts
  const serversIndexFile = join(
    rootDir,
    "packages",
    "capabilities",
    "src",
    "servers",
    "index.ts"
  );
  if (existsSync(serversIndexFile)) {
    let serversIndexContent = readFileSync(serversIndexFile, "utf8");
    serversIndexContent = serversIndexContent.replace(
      `export * from "./${domain}.js";\n`,
      ""
    );
    writeFileSync(serversIndexFile, serversIndexContent);
  }

  // Step 3: Remove from main index.ts
  const mainIndexFile = join(
    rootDir,
    "packages",
    "capabilities",
    "src",
    "index.ts"
  );
  if (existsSync(mainIndexFile)) {
    let mainIndexContent = readFileSync(mainIndexFile, "utf8");

    // Remove from import line
    mainIndexContent = mainIndexContent.replace(
      `, ${domain.toUpperCase()}_SERVER`,
      ""
    );
    mainIndexContent = mainIndexContent.replace(
      `${domain.toUpperCase()}_SERVER, `,
      ""
    );

    // Remove registration
    const registrationRegex = new RegExp(
      `serverRegistry\\.register\\(${domain.toUpperCase()}_SERVER\\);\\s*`,
      "g"
    );
    mainIndexContent = mainIndexContent.replace(registrationRegex, "");

    writeFileSync(mainIndexFile, mainIndexContent);
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function showHelp() {
  console.log(`
🔧 MCP Server Management CLI

USAGE:
  mcp <command> [arguments]

COMMANDS:
  add <domain>     Create a new MCP server from template
  list             List all registered MCP servers  
  remove <domain>  Remove an MCP server (alias: delete)
  help             Show this help message

EXAMPLES:
  mcp add github          # Create GitHub MCP server
  mcp add slack-bot       # Create Slack bot MCP server  
  mcp list                # Show all servers
  mcp remove github       # Remove GitHub server

For more info, see docs/MCP_SERVER_PATTERN.md
`);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getNextAvailablePort() {
  // Read existing servers to find next available port
  try {
    const serversDir = join(
      rootDir,
      "packages",
      "capabilities",
      "src",
      "servers"
    );
    const files = existsSync(serversDir) ? readdirSync(serversDir) : [];
    const serverFiles = files.filter(
      (f) => f.endsWith(".ts") && f !== "index.ts"
    );

    // Start at 3002 (after linear at 3001)
    let nextPort = 3002;

    // Check existing servers for used ports
    serverFiles.forEach((file) => {
      const filePath = join(serversDir, file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf8");
        const portMatch = content.match(/port:\s*(\d+)/);
        if (portMatch) {
          const port = parseInt(portMatch[1], 10);
          if (port >= nextPort) {
            nextPort = port + 1;
          }
        }
      }
    });

    return nextPort;
  } catch {
    // Fallback to simple assignment
    return 3002;
  }
}

// Run CLI
main().catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
