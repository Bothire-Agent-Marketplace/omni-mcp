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
      "@fastify/cors": "^9.0.1",
      "@mcp/schemas": "workspace:*",
      "@mcp/utils": "workspace:*",
      fastify: "^4.28.1",
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
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/schemas" },
    { "path": "../../packages/utils" }
  ],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
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

import { createMcpLogger, setupGlobalErrorHandlers } from "@mcp/utils";
import { ${domain.toLowerCase()}ServerConfig } from "./config/config.js";
import { start${capitalize(domain)}Server } from "./mcp-server/http-server.js";

// Initialize MCP-compliant logger
export const logger = createMcpLogger({
  serverName: "${domain}-mcp-server",
  logLevel: ${domain.toLowerCase()}ServerConfig.logLevel,
  environment: ${domain.toLowerCase()}ServerConfig.env,
});

// Setup global error handlers
setupGlobalErrorHandlers(logger);

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  logger.serverShutdown({ signal: "SIGTERM" });
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.serverShutdown({ signal: "SIGINT" });
  process.exit(0);
});

// Start the server
async function main() {
    logger.serverStartup(${domain.toLowerCase()}ServerConfig.port);
    start${capitalize(domain)}Server(${domain.toLowerCase()}ServerConfig);
  } catch (error) {
    logger.error("Unhandled error during startup", error as Error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main();
}
`;
}

function generateConfigTemplate(domain) {
  return `import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { Environment } from "@mcp/utils";
import { detectEnvironment, loadEnvironment } from "@mcp/utils/env-loader.js";
import { validatePort, validateSecret } from "@mcp/utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_PATH = join(__dirname, "..");

// Load environment variables from .env files
loadEnvironment(SERVICE_PATH);

export interface ${capitalize(domain)}ServerConfig {
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
    port: validatePort(process.env.${domain.toUpperCase()}_SERVER_PORT, ${getNextAvailablePort()}),
    host: process.env.HOST || "0.0.0.0",
    ${domain.toLowerCase()}ApiKey: validateSecret(
      process.env.${domain.toUpperCase()}_API_KEY,
      env,
      "${domain.toUpperCase()}_API_KEY"
    ),
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  };

  return config;
}

export const ${domain.toLowerCase()}ServerConfig = create${capitalize(domain)}ServerConfig();
`;
}

function generateTypesTemplate(domain) {
  return `// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Domain Types
// ============================================================================

// TODO: Add your ${domain}-specific types here
export interface ${capitalize(domain)}Item {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ${capitalize(domain)}Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Resource types for MCP protocol
export interface ${capitalize(domain)}ItemResource {
  id: string;
  name: string;
  description: string;
  uri: string;
  mimeType: string;
}

export interface ${capitalize(domain)}ProjectResource {
  id: string;
  name: string;
  description: string;
  uri: string;
  mimeType: string;
}
`;
}

function generateSchemasTemplate(domain) {
  return `import { z } from "zod";

// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Zod Schemas
// ============================================================================

// TODO: Add your ${domain}-specific validation schemas here
export const ${capitalize(domain)}ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ${capitalize(domain)}ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

// Request/Response schemas
export const Search${capitalize(domain)}ItemsRequestSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10),
});

export const Get${capitalize(domain)}ItemRequestSchema = z.object({
  id: z.string(),
});

export const Create${capitalize(domain)}ItemRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});
`;
}

function generateHandlersTemplate(domain) {
  return `// ============================================================================
// ${domain.toUpperCase()} MCP SERVER - Request Handlers
// ============================================================================

import type { ${capitalize(domain)}ServerConfig } from "../config/config.js";
import type { ${capitalize(domain)}Item, ${capitalize(domain)}Project } from "../types/domain-types.js";
import { logger } from "../index.js";

// TODO: Replace with your actual ${domain} SDK/API client
// import { ${capitalize(domain)}Client } from "@${domain}/sdk";

export class ${capitalize(domain)}Handlers {
  private config: ${capitalize(domain)}ServerConfig;
  // private client: ${capitalize(domain)}Client;

  constructor(config: ${capitalize(domain)}ServerConfig) {
    this.config = config;
    // TODO: Initialize your ${domain} client
    // this.client = new ${capitalize(domain)}Client({ apiKey: config.${domain.toLowerCase()}ApiKey });
  }

  // Tool handlers
  async searchItems(query: string, limit: number = 10): Promise<${capitalize(domain)}Item[]> {
    logger.debug(\`Searching \${query} with limit \${limit}\`);
    
    // TODO: Implement your ${domain} search logic
    // const results = await this.client.searchItems({ query, limit });
    // return results;
    
    // Placeholder implementation
    return [
      {
        id: "1",
        title: \`Sample \${query} item\`,
        description: "This is a placeholder item",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
  }

  async getItem(id: string): Promise<${capitalize(domain)}Item | null> {
    logger.debug(\`Getting item \${id}\`);
    
    // TODO: Implement your ${domain} get item logic
    // const item = await this.client.getItem(id);
    // return item;
    
    // Placeholder implementation
    return {
      id,
      title: \`Sample item \${id}\`,
      description: "This is a placeholder item",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async createItem(title: string, description?: string): Promise<${capitalize(domain)}Item> {
    logger.debug(\`Creating item with title: \${title}\`);
    
    // TODO: Implement your ${domain} create item logic
    // const item = await this.client.createItem({ title, description });
    // return item;
    
    // Placeholder implementation
    return {
      id: Math.random().toString(36).substring(7),
      title,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Resource handlers
  async getProjects(): Promise<${capitalize(domain)}Project[]> {
    logger.debug("Getting projects");
    
    // TODO: Implement your ${domain} get projects logic
    // const projects = await this.client.getProjects();
    // return projects;
    
    // Placeholder implementation
    return [
      {
        id: "1",
        name: "Sample Project",
        description: "This is a placeholder project",
        createdAt: new Date().toISOString(),
      }
    ];
  }
}

// ============================================================================
// TOOL HANDLERS - Following Linear server pattern
// ============================================================================

export async function handle${capitalize(domain)}SearchItems(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  params: unknown
) {
  // TODO: Add Zod validation for params
  const { query, limit } = params as { query?: string; limit?: number };
  
  logger.debug(\`Searching \${query || ""} with limit \${limit || 10}\`);
  
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
        text: JSON.stringify(items, null, 2),
      },
    ],
  };
}

export async function handle${capitalize(domain)}GetItem(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  params: unknown
) {
  // TODO: Add Zod validation for params
  const { id } = params as { id: string };
  
  logger.debug(\`Getting item \${id}\`);
  
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

export async function handle${capitalize(domain)}CreateItem(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  params: unknown
) {
  // TODO: Add Zod validation for params
  const { title, description } = params as { title: string; description?: string };
  
  logger.debug(\`Creating item with title: \${title}\`);
  
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
// RESOURCE HANDLERS - Following Linear server pattern
// ============================================================================

export async function handle${capitalize(domain)}ItemsResource(
  /* ${domain.toLowerCase()}Client: ${capitalize(domain)}Client, */
  uri: string
) {
  try {
    logger.debug("Getting items resource");
    
    // TODO: Implement your ${domain} get items logic
    // const items = await ${domain.toLowerCase()}Client.getItems();
    
    // Placeholder implementation
    const items = [
      {
        id: "1",
        title: "Sample Item",
        description: "This is a placeholder item",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    logger.debug("Getting projects resource");
    
    // TODO: Implement your ${domain} get projects logic
    // const projects = await ${domain.toLowerCase()}Client.getProjects();
    
    // Placeholder implementation
    const projects = [
      {
        id: "1",
        name: "Sample Project",
        description: "This is a placeholder project",
        createdAt: new Date().toISOString(),
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
  return `import cors from "@fastify/cors";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { MCPRequest, MCPResponse, MCPErrorResponse } from "@mcp/schemas";
import { createMcpLogger } from "@mcp/utils";
import type { ${capitalize(domain)}ServerConfig } from "../config/config.js";
import {
  createPromptHandlers,
  getAvailablePrompts,
} from "./prompts.js";
import { createResourceHandlers, getAvailableResources } from "./resources.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual ${domain} SDK/API client
// import { ${capitalize(domain)}Client } from "@${domain}/sdk";

// Default empty parameters object
const DEFAULT_PARAMS: Record<string, unknown> = {};

function createHttpServer(config: ${capitalize(domain)}ServerConfig): FastifyInstance {
  const logger = createMcpLogger({
    serverName: "${domain}-http-server",
    logLevel: config.logLevel,
    environment: config.env,
  });

  // TODO: Initialize your ${domain} client
  // const ${domain.toLowerCase()}Client = new ${capitalize(domain)}Client({ apiKey: config.${domain.toLowerCase()}ApiKey });

  // Create handler registries
  const toolHandlers = createToolHandlers(/* ${domain.toLowerCase()}Client */);
  const resourceHandlers = createResourceHandlers(/* ${domain.toLowerCase()}Client */);
  const promptHandlers = createPromptHandlers();

  const server = fastify({ logger: false }); // Disable default logger to use our own

  server.register(cors);

  server.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      logger.error("Unhandled error:", error);
      reply.status(500).send({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
      });
    }
  );

  server.get("/health", async () => {
    return { status: "ok" };
  });

  // Main MCP endpoint - handles tools, resources, and prompts
  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as MCPRequest;

    if (jsonrpc !== "2.0") {
      const errorResponse: MCPErrorResponse = {
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      };
      reply.status(400).send(errorResponse);
      return;
    }

    try {
      // Handle different MCP methods
      switch (method) {
        case "tools/call": {
          const toolName = params?.name;
          const handler =
            toolName && typeof toolName === "string"
              ? toolHandlers[toolName]
              : undefined;

          if (!handler || !toolName) {
            const errorResponse: MCPErrorResponse = {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: \`Tool not found: \${toolName}\`,
              },
            };
            reply.status(404).send(errorResponse);
            return;
          }

          const result = await handler(
            (params?.arguments as Record<string, unknown>) || DEFAULT_PARAMS
          );
          const response: MCPResponse = { jsonrpc: "2.0", id, result };
          return response;
        }

        case "resources/read": {
          const uri = params?.uri;
          const handler =
            uri && typeof uri === "string" ? resourceHandlers[uri] : undefined;

          if (!handler || !uri) {
            const errorResponse: MCPErrorResponse = {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: \`Resource not found: \${uri}\`,
              },
            };
            reply.status(404).send(errorResponse);
            return;
          }

          const result = await handler(uri as string);
          const response: MCPResponse = { jsonrpc: "2.0", id, result };
          return response;
        }

        case "prompts/get": {
          const name = params?.name;
          const handler =
            name && typeof name === "string" ? promptHandlers[name] : undefined;

          if (!handler || !name) {
            const errorResponse: MCPErrorResponse = {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: \`Prompt not found: \${name}\`,
              },
            };
            reply.status(404).send(errorResponse);
            return;
          }

          const result = await handler(
            (params?.arguments as Record<string, unknown>) || DEFAULT_PARAMS
          );
          const response: MCPResponse = { jsonrpc: "2.0", id, result };
          return response;
        }

        case "tools/list": {
          const tools = getAvailableTools();
          const response: MCPResponse = {
            jsonrpc: "2.0",
            id,
            result: { tools },
          };
          return response;
        }

        case "resources/list": {
          const resources = getAvailableResources();
          const response: MCPResponse = {
            jsonrpc: "2.0",
            id,
            result: { resources },
          };
          return response;
        }

        case "prompts/list": {
          const prompts = getAvailablePrompts();
          const response: MCPResponse = {
            jsonrpc: "2.0",
            id,
            result: { prompts },
          };
          return response;
        }

        default: {
          const errorResponse: MCPErrorResponse = {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: \`Method not found: \${method}\`,
            },
          };
          reply.status(404).send(errorResponse);
          return;
        }
      }
    } catch (error: unknown) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const validationErrors = error.errors
          .map((err) => \`\${err.path.join(".")}: \${err.message}\`)
          .join(", ");

        const errorResponse: MCPErrorResponse = {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params",
            data: \`Validation failed: \${validationErrors}\`,
          },
        };
        reply.status(400).send(errorResponse);
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorResponse: MCPErrorResponse = {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: "Internal server error",
          data: errorMessage,
        },
      };
      reply.status(500).send(errorResponse);
    }
  });

  return server;
}

export async function start${capitalize(domain)}Server(config: ${capitalize(domain)}ServerConfig) {
  const server = createHttpServer(config);
  const { port, host } = config;

  const logger = createMcpLogger({
    serverName: "${domain}-http-server",
    logLevel: config.logLevel,
    environment: config.env,
  });

  try {
    await server.listen({ port, host });
    logger.info(\`🚀 ${capitalize(domain)} MCP HTTP server listening on port \${port}\`);
    logger.info(\`📋 Health check: http://localhost:\${port}/health\`);
    logger.info(\`🔌 MCP endpoint: http://localhost:\${port}/mcp\`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error starting server";
    logger.error("Error starting server", new Error(errorMessage));
    process.exit(1);
  }
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

// Prompt implementation functions
function ${domain.toLowerCase()}WorkflowPrompt(args: unknown = {}) {
  // TODO: Add Zod validation for args if needed
  const { task } = args as { task?: string };
  
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: \`Please help me with this ${domain} task: \${task || "general workflow"}\`,
        },
      },
    ],
  };
}

function ${domain.toLowerCase()}AutomationPrompt(args: unknown = {}) {
  // TODO: Add Zod validation for args if needed
  const { action } = args as { action?: string };
  
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: \`Please automate this ${domain} action: \${action || "general automation"}\`,
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
      description: "Standard ${domain} workflow prompt",
    },
  },
  "${domain}_automation": {
    handler: async (args) => ${domain.toLowerCase()}AutomationPrompt(args),
    metadata: {
      name: "${domain}_automation",
      description: "Automation prompt for ${domain}",
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
