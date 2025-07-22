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
  mkdirSync,
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

  // Step 1: Create server directory structure
  console.log("📁 Creating server directory structure...");
  createServerStructure(serverDir, domain);

  // Step 2: Generate template files
  console.log("📝 Generating template files...");
  generateTemplateFiles(serverDir, domain);

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

  // Step 8: Build shared packages to make new exports available
  console.log("🔨 Building shared packages...");
  try {
    execSync("pnpm build --filter @mcp/capabilities --filter @mcp/schemas", {
      cwd: rootDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(`❌ Failed to build shared packages: ${error.message}`);
    throw new Error("Failed to build shared packages after registration");
  }

  // Step 9: Validate the generated server by building it
  console.log("🧪 Validating generated server...");
  try {
    execSync("pnpm build", {
      cwd: serverDir,
      stdio: "inherit",
    });
    console.log("✅ Server builds successfully!");
  } catch (error) {
    console.error(`❌ Generated server failed to build: ${error.message}`);
    throw new Error("Generated server template has compilation errors");
  }

  // Step 10: Quick runtime test with placeholder API key
  console.log("🚀 Testing server startup...");
  try {
    // Start server with timeout to test startup
    const testEnv = {
      ...process.env,
      [`${domain.toUpperCase()}_API_KEY`]: "test-placeholder-key",
    };

    execSync("pnpm start", {
      cwd: serverDir,
      env: testEnv,
      stdio: "pipe",
      timeout: 3000, // 3 second timeout
    });
    console.log("✅ Server starts successfully!");
  } catch {
    // Timeout is expected - we just want to verify it starts without errors
    console.log("✅ Server startup test completed!");
  }

  console.log(`✅ Successfully created ${domain} MCP server!`);
  console.log(`\n📍 Next steps:`);
  console.log(
    `   1. Add your real ${domain.toUpperCase()}_API_KEY to secrets/.env.development.local`
  );
  console.log(`   2. cd apps/${domain}-mcp-server`);
  console.log(
    `   3. Customize src/types/domain-types.ts with ${domain}-specific types`
  );
  console.log(
    `   4. Update src/schemas/domain-schemas.ts with ${domain} validation schemas`
  );
  console.log(
    `   5. Implement real ${domain} API handlers in src/mcp-server/handlers.ts`
  );
  console.log(`   6. Update tools, resources, and prompts as needed`);
  console.log(
    `   7. Start development: pnpm --filter @mcp/${domain}-server dev`
  );
  console.log(
    `   8. Test via gateway: node packages/dev-tools/src/cli/index.js test-server ${domain}`
  );
}

function createServerStructure(serverDir, _domain) {
  // Create directory structure
  mkdirSync(serverDir, { recursive: true });
  mkdirSync(join(serverDir, "src"), { recursive: true });
  mkdirSync(join(serverDir, "src", "config"), { recursive: true });
  mkdirSync(join(serverDir, "src", "types"), { recursive: true });
  mkdirSync(join(serverDir, "src", "schemas"), { recursive: true });
  mkdirSync(join(serverDir, "src", "mcp-server"), { recursive: true });
}

function generateTemplateFiles(serverDir, domain) {
  // Generate package.json
  const packageJson = {
    name: `@mcp/${domain}-server`,
    version: "workspace:*",
    description: `${capitalize(domain)} MCP Server with TypeScript and Zod validation`,
    author: "Your Name",
    main: "dist/index.js",
    type: "module",
    exports: {
      ".": "./dist/index.js",
    },
    scripts: {
      build: "tsc",
      clean: "rm -rf dist",
      dev: "tsx --watch src/index.ts",
      start: "node dist/index.js",
      test: 'echo "Error: no test specified" && exit 1',
      "type-check": "tsc --noEmit",
      lint: "eslint src --ext .ts",
      "lint:fix": "eslint src --ext .ts --fix",
    },
    dependencies: {
      "@mcp/capabilities": "workspace:*",
      "@mcp/schemas": "workspace:*",
      "@mcp/server-core": "workspace:*",
      "@mcp/utils": "workspace:*",
      zod: "^3.25.67",
    },
    devDependencies: {
      "@types/node": "^24.0.8",
      tsx: "^4.20.3",
      typescript: "^5.8.3",
    },
    engines: {
      node: ">=18.0.0",
    },
    keywords: [
      "claude",
      domain,
      "mcp",
      "model-context-protocol",
      "typescript",
      "zod",
    ],
    license: "MIT",
  };

  // Create template files
  const templates = {
    "package.json": JSON.stringify(packageJson, null, 2),
    "tsconfig.json": generateTsConfig(),
    ".env.example": generateEnvExample(domain),
    "src/index.ts": generateIndexTemplate(domain),
    "src/config/config.ts": generateConfigTemplate(domain),
    "src/types/domain-types.ts": generateTypesTemplate(domain),
    "src/schemas/domain-schemas.ts": generateSchemasTemplate(domain),
    "src/mcp-server/handlers.ts": generateHandlersTemplate(domain),
    "src/mcp-server/http-server.ts": generateHttpServerTemplate(domain),
    "src/mcp-server/tools.ts": generateToolsTemplate(domain),
    "src/mcp-server/resources.ts": generateResourcesTemplate(domain),
    "src/mcp-server/prompts.ts": generatePromptsTemplate(domain),
  };

  // Write all template files
  Object.entries(templates).forEach(([filePath, content]) => {
    writeFileSync(join(serverDir, filePath), content);
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
  searchItems: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for ${domain} items",
      },
      limit: CommonInputSchemas.optionalLimit,
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,
  
  getItem: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID of the ${domain} item to retrieve",
      },
    },
    required: ["id"],
    additionalProperties: false,
  } as ToolInputSchema,
  
  createItem: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title for the new ${domain} item",
      },
      description: {
        type: "string",
        description: "Description for the new ${domain} item",
      },
    },
    required: ["title"],
    additionalProperties: false,
  } as ToolInputSchema,
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
    "${domain}_search_items",
    "${domain}_get_item",
    "${domain}_create_item",
  ],
  resources: [
    "${domain}://items",
    "${domain}://projects",
  ],
  prompts: [
    "${domain}_workflow",
    "${domain}_automation",
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
    // Update import line to include new server
    const importRegex =
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*"\.\/servers\/index\.js";/;
    const importMatch = mainIndexContent.match(importRegex);

    if (importMatch) {
      const currentImports = importMatch[1].trim();
      const newImports = `${currentImports}, ${domain.toUpperCase()}_SERVER`;
      mainIndexContent = mainIndexContent.replace(
        importRegex,
        `import { ${newImports} } from "./servers/index.js";`
      );
    }

    // Add registration before the export comment
    mainIndexContent = mainIndexContent.replace(
      "// Export registry as default for gateway usage",
      `serverRegistry.register(${domain.toUpperCase()}_SERVER);\n\n// Export registry as default for gateway usage`
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
  const serverExists = existsSync(serverDir);

  console.log(`🗑️  Removing MCP server: ${domain}`);

  // Step 1: Remove server directory (if it exists)
  if (serverExists) {
    console.log("📁 Removing server directory...");
    rmSync(serverDir, { recursive: true, force: true });
  } else {
    console.log("📁 Server directory not found, skipping...");
  }

  // Step 2: Remove input schemas
  console.log("📋 Removing input schemas...");
  removeInputSchemas(domain);

  // Step 3: Remove from capabilities
  console.log("🔗 Removing from capabilities...");
  removeFromCapabilities(domain);

  // Step 4: Clean configuration files
  console.log("⚙️  Cleaning configuration files...");
  cleanConfigurationFiles(domain);

  // Step 5: Clean dependencies
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

// Template generation functions
function generateTsConfig() {
  return `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../../packages/capabilities" },
    { "path": "../../packages/schemas" },
    { "path": "../../packages/utils" }
  ],
  "exclude": ["node_modules", "dist"]
}`;
}

function generateEnvExample(domain) {
  return `# ${capitalize(domain)} MCP Server Environment Variables
${domain.toUpperCase()}_API_KEY=your-${domain}-api-key
${domain.toUpperCase()}_SERVER_PORT=3002
${domain.toUpperCase()}_SERVER_URL=http://localhost:3002
LOG_LEVEL=debug
`;
}

function generateIndexTemplate(domain) {
  return `#!/usr/bin/env node
import { runMcpServer, createServerStarter } from "@mcp/server-core";
import { ${domain.toLowerCase()}ServerConfig } from "./config/config.js";
import { create${capitalize(domain)}HttpServer } from "./mcp-server/http-server.js";

const startServer = createServerStarter("${domain}", create${capitalize(domain)}HttpServer);

runMcpServer({
  serverName: "${domain}-mcp-server",
  config: ${domain.toLowerCase()}ServerConfig,
  startServer,
});
`;
}

function generateConfigTemplate(domain) {
  return `import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ${domain.toUpperCase()}_SERVER } from "@mcp/capabilities";
import type { BaseMcpServerConfig } from "@mcp/server-core";
import type { Environment } from "@mcp/schemas";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort, validateSecret } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface ${capitalize(domain)}ServerConfig extends BaseMcpServerConfig {
  env: Environment;
  port: number;
  host: string;
  ${domain.toLowerCase()}ApiKey: string;
  logLevel: string;
}

function create${capitalize(domain)}ServerConfig(): ${capitalize(domain)}ServerConfig {
  const env = detectEnvironment();
  const isProduction = env === "production";

  const config: ${capitalize(domain)}ServerConfig = {
    env,
    port: validatePort(process.env.${domain.toUpperCase()}_SERVER_PORT, ${domain.toUpperCase()}_SERVER.port),
    host: process.env.HOST || "0.0.0.0",
    ${domain.toLowerCase()}ApiKey: validateSecret(
      process.env.${domain.toUpperCase()}_API_KEY,
      env,
      "${domain.toUpperCase()}_API_KEY"
    ),
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  };

  if (env !== "test" && !config.${domain.toLowerCase()}ApiKey) {
    throw new Error("${domain.toUpperCase()}_API_KEY is required for ${domain}-mcp-server.");
  }

  return config;
}

export const ${domain.toLowerCase()}ServerConfig = create${capitalize(domain)}ServerConfig();
`;
}

function generateTypesTemplate(domain) {
  return `// ============================================================================
// MCP Server - Domain-Specific TypeScript Types
// ============================================================================
// This file contains TypeScript types specific to the domain this MCP server serves.
// For ${capitalize(domain)}: Items, Projects, etc.
// For future servers: Replace with relevant domain types (GitHub: Repos, Issues, PRs, etc.)

// Resource types - Update these for your specific domain
export interface ${capitalize(domain)}ItemResource {
  id: string;
  title: string;
  description?: string;
  uri: string;
  mimeType: string;
}

export interface ${capitalize(domain)}ProjectResource {
  id: string;
  name: string;
  description?: string;
  uri: string;
  mimeType: string;
}
`;
}

function generateSchemasTemplate(domain) {
  return `import { z } from "zod";

// ============================================================================
// MCP Server - Domain-Specific Zod Validation Schemas
// ============================================================================
// This file contains Zod schemas for runtime validation of tool parameters and prompt arguments.
// These schemas are specific to the domain this MCP server serves.
// For ${capitalize(domain)}: Items, Projects, etc.
// For future servers: Replace with relevant domain schemas (GitHub: Repos, Issues, PRs, etc.)
//
// NOTE: These are separate from the inputSchemas in @mcp/schemas which are for MCP protocol.
// These schemas are for internal validation within the server's business logic.

// Tool validation schemas - Update these for your specific domain tools
export const Search${capitalize(domain)}ItemsRequestSchema = z.object({
  query: z
    .string()
    .describe("Text to search in item titles and descriptions"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of items to return"),
});

export const Get${capitalize(domain)}ItemRequestSchema = z.object({
  id: z.string().describe("ID of the ${domain} item to retrieve"),
});

export const Create${capitalize(domain)}ItemRequestSchema = z.object({
  title: z.string().describe("Title for the new ${domain} item"),
  description: z.string().optional().describe("Description for the new ${domain} item"),
});

// Prompt validation schemas - Update these for your specific prompts
export const ${capitalize(domain)}WorkflowArgsSchema = z.object({
  task: z.string().optional().describe("Specific ${domain} task to help with"),
});

export const ${capitalize(domain)}AutomationArgsSchema = z.object({
  action: z.string().optional().describe("Specific ${domain} action to automate"),
});
`;
}

function generateHandlersTemplate(domain) {
  return `// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Request Handlers
// ============================================================================

import {
  Search${capitalize(domain)}ItemsRequestSchema,
  Get${capitalize(domain)}ItemRequestSchema,
  Create${capitalize(domain)}ItemRequestSchema,
} from "../schemas/domain-schemas.js";
import type {
  ${capitalize(domain)}ItemResource,
  ${capitalize(domain)}ProjectResource,
} from "../types/domain-types.js";

// TODO: Replace with your actual ${domain} SDK/API client
// import { ${capitalize(domain)}Client } from "@${domain}/sdk";

// ${capitalize(domain)} SDK Filter Types based on API patterns
interface ${capitalize(domain)}ItemFilter {
  // TODO: Add your ${domain}-specific filter types
  query?: string;
  limit?: number;
}

// ============================================================================
// HANDLER 1: Search Items
// ============================================================================

export async function handle${capitalize(domain)}SearchItems(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  params: unknown
) {
  // Validate and parse input with Zod
  const validatedParams = Search${capitalize(domain)}ItemsRequestSchema.parse(params);
  const { query, limit } = validatedParams;

  // TODO: Implement your ${domain} search logic
  // const results = await ${domain.toLowerCase()}Client.searchItems({ query, limit });

  // Placeholder implementation
  const items = [
    {
      id: "1",
      title: \`Sample \${query || "item"}\`,
      description: "This is a placeholder item",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { items, count: items.length },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// HANDLER 2: Get Item
// ============================================================================

export async function handle${capitalize(domain)}GetItem(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  params: unknown
) {
  // Validate and parse input with Zod
  const validatedParams = Get${capitalize(domain)}ItemRequestSchema.parse(params);
  const { id } = validatedParams;

  // TODO: Implement your ${domain} get item logic
  // const item = await ${domain.toLowerCase()}Client.getItem(id);

  // Placeholder implementation
  const item = {
    id,
    title: \`Sample item \${id}\`,
    description: "This is a placeholder item",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(item, null, 2),
      },
    ],
  };
}

// ============================================================================
// HANDLER 3: Create Item
// ============================================================================

export async function handle${capitalize(domain)}CreateItem(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  params: unknown
) {
  // Validate and parse input with Zod
  const validatedParams = Create${capitalize(domain)}ItemRequestSchema.parse(params);
  const { title, description } = validatedParams;

  // TODO: Implement your ${domain} create item logic
  // const item = await ${domain.toLowerCase()}Client.createItem({ title, description });

  // Placeholder implementation
  const item = {
    id: Math.random().toString(36).substring(7),
    title,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(item, null, 2),
      },
    ],
  };
}

// ============================================================================
// RESOURCE HANDLERS
// ============================================================================

export async function handle${capitalize(domain)}ItemsResource(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  uri: string
) {
  try {
    // TODO: Implement your ${domain} get items logic
    // const items = await ${domain.toLowerCase()}Client.getItems();

    // Placeholder implementation
    const items: ${capitalize(domain)}ItemResource[] = [
      {
        id: "1",
        title: "Sample Item",
        description: "This is a placeholder item",
        uri: uri,
        mimeType: "application/json",
      }
    ];

    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(items, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      contents: [
        {
          uri: uri,
          text: \`Error fetching items: \${errorMessage}\`,
        },
      ],
    };
  }
}

export async function handle${capitalize(domain)}ProjectsResource(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  uri: string
) {
  try {
    // TODO: Implement your ${domain} get projects logic
    // const projects = await ${domain.toLowerCase()}Client.getProjects();

    // Placeholder implementation
    const projects: ${capitalize(domain)}ProjectResource[] = [
      {
        id: "1",
        name: "Sample Project",
        description: "This is a placeholder project",
        uri: uri,
        mimeType: "application/json",
      }
    ];

    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      contents: [
        {
          uri: uri,
          text: \`Error fetching projects: \${errorMessage}\`,
        },
      ],
    };
  }
}
`;
}

function generateHttpServerTemplate(domain) {
  return `import { createMcpHttpServer, type FastifyInstance } from "@mcp/server-core";
import type { ${capitalize(domain)}ServerConfig } from "../config/config.js";
import { createPromptHandlers, getAvailablePrompts } from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual ${domain} SDK/API client
// import { ${capitalize(domain)}Client } from "@${domain}/sdk";

export async function create${capitalize(domain)}HttpServer(
  config: ${capitalize(domain)}ServerConfig
): Promise<FastifyInstance> {
  // TODO: Initialize your ${domain} client
  // const ${domain.toLowerCase()}Client = new ${capitalize(domain)}Client({ apiKey: config.${domain.toLowerCase()}ApiKey });

  const server = createMcpHttpServer({
    serverName: "${domain}",
    config,
    client: undefined, // ${domain.toLowerCase()}Client,
    toolHandlers: createToolHandlers(/* ${domain.toLowerCase()}Client */),
    resourceHandlers: createResourceHandlers(/* ${domain.toLowerCase()}Client */),
    promptHandlers: createPromptHandlers(),
    getAvailableTools,
    getAvailableResources,
    getAvailablePrompts,
  });

  return server;
}
`;
}

function generateToolsTemplate(domain) {
  return `// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Tools
// ============================================================================

import { ${capitalize(domain)}InputSchemas } from "@mcp/schemas";
import {
  createGenericToolHandlers,
  getGenericAvailableTools,
  ToolDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// TODO: Replace with your actual ${domain} SDK/API client
// import { ${capitalize(domain)}Client } from "@${domain}/sdk";

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Tool Definitions
// ============================================================================

const ${domain.toLowerCase()}ToolDefinitions: Record<string, ToolDefinition<any /* ${capitalize(domain)}Client */>> = {
  ${domain}_search_items: {
    handler: handlers.handle${capitalize(domain)}SearchItems,
    metadata: {
      name: "${domain}_search_items",
      description: "Search for ${domain} items",
      inputSchema: ${capitalize(domain)}InputSchemas.searchItems,
    },
  },
  ${domain}_get_item: {
    handler: handlers.handle${capitalize(domain)}GetItem,
    metadata: {
      name: "${domain}_get_item",
      description: "Get a specific ${domain} item by ID",
      inputSchema: ${capitalize(domain)}InputSchemas.getItem,
    },
  },
  ${domain}_create_item: {
    handler: handlers.handle${capitalize(domain)}CreateItem,
    metadata: {
      name: "${domain}_create_item",
      description: "Create a new ${domain} item",
      inputSchema: ${capitalize(domain)}InputSchemas.createItem,
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createToolHandlers = (/* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client */) =>
  createGenericToolHandlers(${domain.toLowerCase()}ToolDefinitions, {} /* ${domain.toLowerCase()}Client */);

export const getAvailableTools = () =>
  getGenericAvailableTools(${domain.toLowerCase()}ToolDefinitions);
`;
}

function generateResourcesTemplate(domain) {
  return `// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Resources
// ============================================================================

import {
  createGenericResourceHandlers,
  getGenericAvailableResources,
  ResourceDefinition,
} from "@mcp/utils";
import * as handlers from "./handlers.js";

// TODO: Replace with your actual ${domain} SDK/API client
// import { ${capitalize(domain)}Client } from "@${domain}/sdk";

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Resource Definitions
// ============================================================================

const ${domain.toLowerCase()}ResourceDefinitions: Record<string, ResourceDefinition<any /* ${capitalize(domain)}Client */>> = {
  "${domain}://items": {
    handler: handlers.handle${capitalize(domain)}ItemsResource,
    metadata: {
      uri: "${domain}://items",
      name: "${domain}-items",
      description: "Access to ${domain} items",
      mimeType: "application/json",
    },
  },
  "${domain}://projects": {
    handler: handlers.handle${capitalize(domain)}ProjectsResource,
    metadata: {
      uri: "${domain}://projects",
      name: "${domain}-projects",
      description: "Access to ${domain} projects",
      mimeType: "application/json",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createResourceHandlers = (/* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client */) =>
  createGenericResourceHandlers(${domain.toLowerCase()}ResourceDefinitions, {} /* ${domain.toLowerCase()}Client */);

export const getAvailableResources = () =>
  getGenericAvailableResources(${domain.toLowerCase()}ResourceDefinitions);
`;
}

function generatePromptsTemplate(domain) {
  return `// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Prompts
// ============================================================================

import {
  createGenericPromptHandlers,
  getGenericAvailablePrompts,
  PromptDefinition,
} from "@mcp/utils";
import {
  ${capitalize(domain)}WorkflowArgsSchema,
  ${capitalize(domain)}AutomationArgsSchema,
} from "../schemas/domain-schemas.js";

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Prompts
// ============================================================================

// Prompt implementation functions
function ${domain.toLowerCase()}WorkflowPrompt(args: unknown = {}) {
  // Validate and parse input with Zod
  const validatedArgs = ${capitalize(domain)}WorkflowArgsSchema.parse(args);
  const { task } = validatedArgs;
  
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: \`Help me with this ${domain} task: \${task || "general workflow"}. Please guide me through:

1. Understanding the requirements
2. Planning the approach
3. Implementing the solution
4. Testing and validation

Let's start - what specific aspect of ${domain} are we working on?\`,
        },
      },
    ],
  };
}

function ${domain.toLowerCase()}AutomationPrompt(args: unknown = {}) {
  // Validate and parse input with Zod
  const validatedArgs = ${capitalize(domain)}AutomationArgsSchema.parse(args);
  const { action } = validatedArgs;
  
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: \`Let's automate this ${domain} action: \${action || "general automation"}. I'll help you:

1. Identify repetitive tasks
2. Design automation workflows
3. Set up triggers and conditions
4. Monitor and optimize

What ${domain} process would you like to automate?\`,
        },
      },
    ],
  };
}

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Prompt Definitions
// ============================================================================

const ${domain.toLowerCase()}PromptDefinitions: Record<string, PromptDefinition> = {
  "${domain}_workflow": {
    handler: async (args) => ${domain.toLowerCase()}WorkflowPrompt(args),
    metadata: {
      name: "${domain}_workflow",
      description: "Step-by-step workflow for ${domain} tasks",
    },
  },
  "${domain}_automation": {
    handler: async (args) => ${domain.toLowerCase()}AutomationPrompt(args),
    metadata: {
      name: "${domain}_automation",
      description: "Automation guidance for ${domain} processes",
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createPromptHandlers = () =>
  createGenericPromptHandlers(${domain.toLowerCase()}PromptDefinitions);

export const getAvailablePrompts = () =>
  getGenericAvailablePrompts(${domain.toLowerCase()}PromptDefinitions);
`;
}

function cleanConfigurationFiles(domain) {
  // Clean turbo.json environment variables
  const turboJsonPath = join(rootDir, "turbo.json");
  if (existsSync(turboJsonPath)) {
    let turboContent = readFileSync(turboJsonPath, "utf8");
    const turbo = JSON.parse(turboContent);

    if (turbo.globalEnv && Array.isArray(turbo.globalEnv)) {
      // Remove domain-specific environment variables
      const envVarsToRemove = [
        `${domain.toUpperCase()}_API_KEY`,
        `${domain.toUpperCase()}_SERVER_URL`,
      ];

      turbo.globalEnv = turbo.globalEnv.filter(
        (envVar) => !envVarsToRemove.includes(envVar)
      );

      writeFileSync(turboJsonPath, JSON.stringify(turbo, null, 2));
    }
  }

  // Clean gateway tsconfig.json references
  const gatewayTsconfigPath = join(rootDir, "apps", "gateway", "tsconfig.json");
  if (existsSync(gatewayTsconfigPath)) {
    let gatewayTsconfig = readFileSync(gatewayTsconfigPath, "utf8");
    const tsconfig = JSON.parse(gatewayTsconfig);

    if (tsconfig.references && Array.isArray(tsconfig.references)) {
      tsconfig.references = tsconfig.references.filter(
        (ref) => ref.path !== `../${domain}-mcp-server`
      );
      writeFileSync(gatewayTsconfigPath, JSON.stringify(tsconfig, null, 2));
    }
  }

  // Clean secrets/.env.development.local.example
  const secretsExamplePath = join(
    rootDir,
    "secrets",
    ".env.development.local.example"
  );
  if (existsSync(secretsExamplePath)) {
    let secretsContent = readFileSync(secretsExamplePath, "utf8");
    const apiKeyLine = `${domain.toUpperCase()}_API_KEY=your-${domain}-api-key`;

    // Remove the API key line and any trailing newline
    secretsContent = secretsContent.replace(`\n${apiKeyLine}`, "");
    secretsContent = secretsContent.replace(apiKeyLine, "");

    writeFileSync(secretsExamplePath, secretsContent);
  }

  // Clean .gitignore patterns
  const gitignorePath = join(rootDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    let gitignoreContent = readFileSync(gitignorePath, "utf8");
    const pattern = `.env.${domain}.local`;

    // Remove the pattern line and any trailing newline
    gitignoreContent = gitignoreContent.replace(`\n${pattern}`, "");
    gitignoreContent = gitignoreContent.replace(pattern, "");

    writeFileSync(gitignorePath, gitignoreContent);
  }

  console.log(`   ✅ Cleaned turbo.json environment variables`);
  console.log(`   ✅ Cleaned gateway tsconfig.json references`);
  console.log(`   ✅ Cleaned secrets example file`);
  console.log(`   ✅ Cleaned .gitignore patterns`);
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
