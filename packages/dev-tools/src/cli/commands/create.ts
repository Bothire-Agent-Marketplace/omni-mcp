import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CreateOptions {
  template: string;
  port: string;
  skipDocker?: boolean;
}

export async function createMcpServer(
  serviceName: string,
  options: CreateOptions
) {
  console.log(
    `🏗️  Creating ${serviceName} MCP server following Official MCP SDK Pattern...`
  );

  // Validate service name
  if (!/^[a-z][a-z0-9-]*$/.test(serviceName)) {
    console.error(
      "❌ Service name must be lowercase, start with a letter, and contain only letters, numbers, and dashes"
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, "../../../../..");
  const serverPath = path.join(
    projectRoot,
    "servers",
    `${serviceName}-mcp-server`
  );

  // Check if server already exists
  if (fs.existsSync(serverPath)) {
    console.error(
      `❌ MCP server '${serviceName}' already exists at ${serverPath}`
    );
    process.exit(1);
  }

  try {
    // Create server directory structure
    await createServerStructure(serviceName, serverPath, options);

    // Update workspace configuration
    await updateWorkspaceConfig(serviceName, projectRoot);

    console.log("✅ MCP server created successfully!");
    console.log("");
    console.log("📁 Created files:");
    console.log(`   📂 servers/${serviceName}-mcp-server/`);
    console.log("");
    console.log("🚀 Next steps:");
    console.log(`   1. cd servers/${serviceName}-mcp-server`);
    console.log(`   2. Configure your API credentials in src/config/config.ts`);
    console.log(`   3. Implement your tools in src/mcp-server/tools.ts`);
    console.log(
      `   4. Implement your resources in src/mcp-server/resources.ts`
    );
    console.log(`   5. Implement your prompts in src/mcp-server/prompts.ts`);
    console.log(`   6. Run: pnpm build`);
    console.log(`   7. Test: omni validate ${serviceName}`);
  } catch (error) {
    console.error("❌ Error creating MCP server:", error);
    process.exit(1);
  }
}

async function createServerStructure(
  serviceName: string,
  serverPath: string,
  options: CreateOptions
) {
  // Create directory structure
  fs.mkdirSync(serverPath, { recursive: true });
  fs.mkdirSync(path.join(serverPath, "src", "config"), { recursive: true });
  fs.mkdirSync(path.join(serverPath, "src", "mcp-server"), { recursive: true });

  // Generate files from templates
  const files = {
    "package.json": generatePackageJson(serviceName),
    "tsconfig.json": generateTsConfig(),
    Dockerfile: generateDockerfile(serviceName),
    "README.md": generateReadme(serviceName),
    ".env.example": generateServiceEnvExample(serviceName),
    "src/index.ts": generateIndex(serviceName),
    "src/config/config.ts": generateConfig(serviceName),
    "src/mcp-server/server.ts": generateServer(serviceName),
    "src/mcp-server/tools.ts": generateTools(serviceName),
    "src/mcp-server/resources.ts": generateResources(serviceName),
    "src/mcp-server/prompts.ts": generatePrompts(serviceName),
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(serverPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Update centralized secrets file
  await updateCentralizedSecrets(serviceName);
}

async function updateWorkspaceConfig(serviceName: string, projectRoot: string) {
  // Update pnpm-workspace.yaml if needed
  const workspacePath = path.join(projectRoot, "pnpm-workspace.yaml");
  const workspaceContent = fs.readFileSync(workspacePath, "utf8");

  if (!workspaceContent.includes("servers/*")) {
    console.log("ℹ️  pnpm-workspace.yaml already includes servers/*");
  }
}

// Template generators
function generatePackageJson(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `{
  "name": "@mcp/${serviceName}-server",
  "version": "1.0.0",
  "description": "${capitalizedName} MCP Server - Official MCP SDK implementation following Omni patterns",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@mcp/utils": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "${serviceName}",
    "official-sdk",
    "omni"
  ],
  "author": "Omni MCP Team",
  "license": "MIT"
}
`;
}

function generateTsConfig(): string {
  return `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules"
  ]
}
`;
}

function generateDockerfile(serviceName: string): string {
  return `# Multi-stage Dockerfile for ${serviceName} MCP Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy shared dependencies
COPY shared/utils/package.json ./shared/utils/
COPY shared/utils/tsconfig.json ./shared/utils/
COPY shared/utils/src/ ./shared/utils/src/

# Copy server
COPY servers/${serviceName}-mcp-server/package.json ./servers/${serviceName}-mcp-server/
COPY servers/${serviceName}-mcp-server/tsconfig.json ./servers/${serviceName}-mcp-server/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy server source code
COPY servers/${serviceName}-mcp-server/src/ ./servers/${serviceName}-mcp-server/src/

# Build shared dependencies first
RUN cd shared/utils && pnpm build

# Build server
RUN cd servers/${serviceName}-mcp-server && pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/servers/${serviceName}-mcp-server/dist ./dist
COPY --from=builder /app/servers/${serviceName}-mcp-server/package.json ./package.json

# Install production dependencies only
RUN npm install --production --ignore-scripts

# Add non-root user for security
RUN addgroup -g 1001 -S mcpuser && \\
    adduser -S mcpuser -u 1001

USER mcpuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "console.log('${serviceName} MCP Server healthy')" || exit 1

EXPOSE 3000

CMD ["node", "dist/index.js"]
`;
}

function generateReadme(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `# ${capitalizedName} MCP Server

Official MCP SDK implementation following **Omni MCP Enterprise Pattern**.

## 🏗️ Architecture

This server implements the [Enterprise MCP Server Pattern](../../docs/MCP_SERVER_PATTERN.md) with:

- ✅ Official MCP SDK pattern with \`server.registerTool()\`, \`server.registerResource()\`, \`server.registerPrompt()\`
- ✅ Clean separation: tools.ts, resources.ts, prompts.ts, server.ts
- ✅ Proper Zod validation within request handlers
- ✅ Enterprise-grade Docker containerization
- ✅ Hierarchical environment variable management

## 🚀 Quick Start

\`\`\`bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start
\`\`\`

## 🔧 Configuration

Edit \`src/config/config.ts\` with your ${capitalizedName} credentials:

\`\`\`typescript
export const CONFIG = {
  API_KEY: env.${serviceName.toUpperCase()}_API_KEY,
  BASE_URL: env.${serviceName.toUpperCase()}_BASE_URL || "https://api.${serviceName}.com",
};
\`\`\`

## 🛠️ Implementation

1. **Tools**: Implement your ${serviceName} tools in \`src/mcp-server/tools.ts\`
2. **Resources**: Implement your ${serviceName} resources in \`src/mcp-server/resources.ts\`
3. **Prompts**: Implement your ${serviceName} prompts in \`src/mcp-server/prompts.ts\`
4. **Configuration**: Add environment variables to \`src/config/config.ts\`

## 📊 Validation

\`\`\`bash
# Validate enterprise pattern compliance
omni validate ${serviceName}

# Test functionality
omni test ${serviceName}
\`\`\`

## 🐳 Docker

\`\`\`bash
# Build image
docker build -t ${serviceName}-mcp-server .

# Run container
docker run -e ${serviceName.toUpperCase()}_API_KEY=your_key ${serviceName}-mcp-server
\`\`\`

## 📖 Documentation

- [Enterprise MCP Server Pattern](../../docs/MCP_SERVER_PATTERN.md)
- [Development Guide](../../docs/DEVELOPMENT.md)
- [Official MCP SDK](https://github.com/modelcontextprotocol/sdk)
`;
}

function generateIndex(serviceName: string): string {
  return `#!/usr/bin/env node

import { create${
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
  }McpServer } from "./mcp-server/server.js";

async function main() {
  const server = create${
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
  }McpServer();
  
  // Connect to stdio for MCP communication
  const transport = server.connect({
    type: "stdio"
  });

  console.error(\`${
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
  } MCP Server running on stdio\`);
  console.error(\`Server: ${serviceName}-mcp-server v1.0.0\`);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down ${serviceName} MCP server...');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error in ${serviceName} MCP server:", error);
  process.exit(1);
});
`;
}

function generateConfig(serviceName: string): string {
  const upperCaseName = serviceName.toUpperCase();
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `// ${capitalizedName} MCP Server Configuration
// Following Official MCP SDK Pattern

import { loadEnvHierarchy } from "@mcp/utils";

// Load environment variables with proper hierarchy
const env = loadEnvHierarchy();

export const CONFIG = {
  // API Configuration
  API_KEY: env.${upperCaseName}_API_KEY,
  BASE_URL: env.${upperCaseName}_BASE_URL || "https://api.${serviceName}.com",
  
  // Server Configuration  
  NAME: "${serviceName}-mcp-server",
  VERSION: "1.0.0",
  
  // Rate Limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: parseInt(env.${upperCaseName}_RATE_LIMIT || "60"),
    BURST_LIMIT: parseInt(env.${upperCaseName}_BURST_LIMIT || "10"),
  },

  // Timeouts
  TIMEOUTS: {
    REQUEST_TIMEOUT: parseInt(env.${upperCaseName}_REQUEST_TIMEOUT || "30000"),
    CONNECTION_TIMEOUT: parseInt(env.${upperCaseName}_CONNECTION_TIMEOUT || "10000"),
  },

  // Feature Flags
  FEATURES: {
    ENABLE_CACHING: env.${upperCaseName}_ENABLE_CACHING === "true",
    ENABLE_METRICS: env.${upperCaseName}_ENABLE_METRICS === "true",
    DEBUG_MODE: env.NODE_ENV === "development",
  }
} as const;

// Validation
if (!CONFIG.API_KEY) {
  console.error("❌ ${upperCaseName}_API_KEY environment variable is required");
  process.exit(1);
}

console.error(\`${capitalizedName} API Key: ✓ Configured\`);
`;
}

function generateServer(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

export function create${capitalizedName}McpServer() {
  const server = new Server(
    {
      name: "${serviceName}-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Register all MCP primitives using official SDK pattern
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
`;
}

function generateTools(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CONFIG } from "../config/config.js";

export function registerTools(server: Server) {
  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "${serviceName}_search",
        description: "Search ${serviceName} entities",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            limit: {
              type: "number",
              description: "Maximum number of results",
              default: 10,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "${serviceName}_get",
        description: "Get a specific ${serviceName} entity by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Entity ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "${serviceName}_create",
        description: "Create a new ${serviceName} entity",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Entity title",
            },
            description: {
              type: "string",
              description: "Entity description",
            },
          },
          required: ["title"],
        },
      },
    ],
  }));

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "${serviceName}_search": {
        const SearchSchema = z.object({
          query: z.string(),
          limit: z.number().optional().default(10),
        });

        try {
          const { query, limit } = SearchSchema.parse(args);
          
          // TODO: Implement your ${serviceName} search logic here
          const results = await search${capitalizedName}(query, limit);

          return {
            content: [
              {
                type: "text",
                text: \`Found \${results.length} ${serviceName} entities for: \${query}\`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InvalidParams,
            \`Invalid search parameters: \${error}\`
          );
        }
      }

      case "${serviceName}_get": {
        const GetSchema = z.object({
          id: z.string(),
        });

        try {
          const { id } = GetSchema.parse(args);
          
          // TODO: Implement your ${serviceName} get logic here
          const entity = await get${capitalizedName}(id);

          return {
            content: [
              {
                type: "text",
                text: \`Retrieved ${serviceName} entity: \${entity.title}\`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InvalidParams,
            \`Invalid get parameters: \${error}\`
          );
        }
      }

      case "${serviceName}_create": {
        const CreateSchema = z.object({
          title: z.string(),
          description: z.string().optional(),
        });

        try {
          const { title, description } = CreateSchema.parse(args);
          
          // TODO: Implement your ${serviceName} create logic here
          const entity = await create${capitalizedName}({ title, description });

          return {
            content: [
              {
                type: "text",
                text: \`Created ${serviceName} entity: \${entity.title} (ID: \${entity.id})\`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InvalidParams,
            \`Invalid create parameters: \${error}\`
          );
        }
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          \`Unknown tool: \${name}\`
        );
    }
  });
}

// TODO: Implement these functions with your actual ${serviceName} API calls
async function search${capitalizedName}(query: string, limit: number) {
  // Placeholder implementation
  return [
    { id: "1", title: \`Sample \${query} result 1\`, description: "Description 1" },
    { id: "2", title: \`Sample \${query} result 2\`, description: "Description 2" },
  ].slice(0, limit);
}

async function get${capitalizedName}(id: string) {
  // Placeholder implementation
  return { id, title: \`Sample entity \${id}\`, description: \`Description for \${id}\` };
}

async function create${capitalizedName}(data: { title: string; description?: string }) {
  // Placeholder implementation
  return { id: Math.random().toString(36).substr(2, 9), ...data };
}
`;
}

function generateResources(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { CONFIG } from "../config/config.js";

export function registerResources(server: Server) {
  // Register list_resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "${serviceName}://entities",
        name: "${capitalizedName} Entities",
        description: "List of all ${serviceName} entities",
        mimeType: "application/json",
      },
      {
        uri: "${serviceName}://stats",
        name: "${capitalizedName} Statistics",
        description: "Usage statistics and metrics",
        mimeType: "application/json",
      },
      {
        uri: "${serviceName}://config",
        name: "${capitalizedName} Configuration",
        description: "Current server configuration",
        mimeType: "application/json",
      },
    ],
  }));

  // Register resource reading handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "${serviceName}://entities": {
        // TODO: Implement your ${serviceName} entities fetching logic
        const entities = await get${capitalizedName}Entities();
        
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(entities, null, 2),
            },
          ],
        };
      }

      case "${serviceName}://stats": {
        // TODO: Implement your ${serviceName} stats logic
        const stats = await get${capitalizedName}Stats();
        
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "${serviceName}://config": {
        const config = {
          name: CONFIG.NAME,
          version: CONFIG.VERSION,
          baseUrl: CONFIG.BASE_URL,
          features: CONFIG.FEATURES,
        };
        
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          \`Unknown resource: \${uri}\`
        );
    }
  });
}

// TODO: Implement these functions with your actual ${serviceName} API calls
async function get${capitalizedName}Entities() {
  // Placeholder implementation
  return [
    { id: "1", title: "Sample Entity 1", description: "Description 1" },
    { id: "2", title: "Sample Entity 2", description: "Description 2" },
    { id: "3", title: "Sample Entity 3", description: "Description 3" },
  ];
}

async function get${capitalizedName}Stats() {
  // Placeholder implementation
  return {
    totalEntities: 150,
    activeUsers: 25,
    requestsToday: 1250,
    uptime: "99.9%",
    lastUpdated: new Date().toISOString(),
  };
}
`;
}

function generatePrompts(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { CONFIG } from "../config/config.js";

export function registerPrompts(server: Server) {
  // Register list_prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "${serviceName}_workflow",
        description: "Generate a ${serviceName} workflow template",
        arguments: [
          {
            name: "task_type",
            description: "Type of task to create workflow for",
            required: true,
          },
          {
            name: "complexity",
            description: "Workflow complexity level (simple, medium, complex)",
            required: false,
          },
        ],
      },
      {
        name: "${serviceName}_analysis",
        description: "Analyze ${serviceName} data and provide insights",
        arguments: [
          {
            name: "data_type",
            description: "Type of data to analyze",
            required: true,
          },
          {
            name: "time_period",
            description: "Time period for analysis (day, week, month)",
            required: false,
          },
        ],
      },
      {
        name: "${serviceName}_report",
        description: "Generate a comprehensive ${serviceName} report",
        arguments: [
          {
            name: "report_type",
            description: "Type of report to generate",
            required: true,
          },
        ],
      },
    ],
  }));

  // Register prompt generation handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "${serviceName}_workflow": {
        const taskType = args?.task_type as string;
        const complexity = (args?.complexity as string) || "medium";
        
        return {
          description: \`${capitalizedName} workflow for \${taskType} (\${complexity} complexity)\`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: \`Create a \${complexity} ${serviceName} workflow for \${taskType}. Include step-by-step instructions, best practices, and potential pitfalls to avoid.\`,
              },
            },
          ],
        };
      }

      case "${serviceName}_analysis": {
        const dataType = args?.data_type as string;
        const timePeriod = (args?.time_period as string) || "week";
        
        return {
          description: \`${capitalizedName} analysis for \${dataType} over \${timePeriod}\`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: \`Analyze the \${dataType} data from ${serviceName} over the past \${timePeriod}. Provide insights, trends, and actionable recommendations.\`,
              },
            },
          ],
        };
      }

      case "${serviceName}_report": {
        const reportType = args?.report_type as string;
        
        return {
          description: \`${capitalizedName} \${reportType} report\`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: \`Generate a comprehensive \${reportType} report for ${serviceName}. Include key metrics, performance indicators, and strategic recommendations.\`,
              },
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          \`Unknown prompt: \${name}\`
        );
    }
  });
}
`;
}

function generateServiceEnvExample(serviceName: string): string {
  const upperCaseName = serviceName.toUpperCase();

  return `# ${
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
  } MCP Server Configuration
# Service-specific environment variables (non-sensitive)

# Server Configuration
${upperCaseName}_BASE_URL=https://api.${serviceName}.com
${upperCaseName}_RATE_LIMIT=60
${upperCaseName}_BURST_LIMIT=10
${upperCaseName}_REQUEST_TIMEOUT=30000
${upperCaseName}_CONNECTION_TIMEOUT=10000

# Feature Flags
${upperCaseName}_ENABLE_CACHING=true
${upperCaseName}_ENABLE_METRICS=true

# Development Settings
NODE_ENV=development
LOG_LEVEL=info

# NOTE: Sensitive values like API keys are stored in centralized secrets:
# secrets/.env.development.local (for development)
# secrets/.env.production.local (for production)
`;
}

async function updateCentralizedSecrets(serviceName: string) {
  const projectRoot = path.resolve(__dirname, "../../../../..");
  const secretsPath = path.join(
    projectRoot,
    "secrets",
    ".env.development.local.example"
  );

  const upperCaseName = serviceName.toUpperCase();
  const newSecretLine = `${upperCaseName}_API_KEY=your_${serviceName}_api_key_here`;

  if (fs.existsSync(secretsPath)) {
    const content = fs.readFileSync(secretsPath, "utf8");
    if (!content.includes(`${upperCaseName}_API_KEY`)) {
      fs.appendFileSync(
        secretsPath,
        `\n# ${
          serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
        } API Configuration\n${newSecretLine}\n`
      );
    }
  } else {
    fs.mkdirSync(path.dirname(secretsPath), { recursive: true });
    fs.writeFileSync(
      secretsPath,
      `# Centralized Development Secrets\n# Copy to .env.development.local and add your actual values\n\n# ${
        serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
      } API Configuration\n${newSecretLine}\n`
    );
  }
}
