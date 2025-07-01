import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CreateOptions {
  template: string;
  port: string;
  skipSchemas?: boolean;
  skipDocker?: boolean;
}

export async function createMcpServer(
  serviceName: string,
  options: CreateOptions
) {
  console.log(
    `🏗️  Creating ${serviceName} MCP server following Enterprise MCP Server Pattern...`
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
  const schemasPath = path.join(
    projectRoot,
    "shared",
    "schemas",
    "src",
    serviceName
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

    // Create shared schemas if not skipped
    if (!options.skipSchemas) {
      await createSharedSchemas(serviceName, schemasPath);
    }

    // Update workspace configuration
    await updateWorkspaceConfig(serviceName, projectRoot);

    console.log("✅ MCP server created successfully!");
    console.log("");
    console.log("📁 Created files:");
    console.log(`   📂 servers/${serviceName}-mcp-server/`);
    console.log(`   📂 shared/schemas/src/${serviceName}/`);
    console.log("");
    console.log("🚀 Next steps:");
    console.log(`   1. cd servers/${serviceName}-mcp-server`);
    console.log(`   2. Configure your API credentials in src/config/config.ts`);
    console.log(
      `   3. Implement your tools in src/mcp-server/tools/${serviceName}-tools.ts`
    );
    console.log(
      `   4. Update shared schemas in shared/schemas/src/${serviceName}/mcp-types.ts`
    );
    console.log(`   5. Run: pnpm build`);
    console.log(`   6. Test: omni validate ${serviceName}`);
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
  const templatesPath = path.join(__dirname, "..", "templates", "server");

  // Create directory structure
  fs.mkdirSync(serverPath, { recursive: true });
  fs.mkdirSync(path.join(serverPath, "src", "config"), { recursive: true });
  fs.mkdirSync(path.join(serverPath, "src", "mcp-server", "tools"), {
    recursive: true,
  });

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
    [`src/mcp-server/tools/${serviceName}-tools.ts`]:
      generateToolsImplementation(serviceName),
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(serverPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Update centralized secrets file
  await updateCentralizedSecrets(serviceName);
}

async function createSharedSchemas(serviceName: string, schemasPath: string) {
  fs.mkdirSync(schemasPath, { recursive: true });

  // Generate both MCP types and domain-specific entity types
  const mcpTypesContent = generateMcpTypes(serviceName);
  const entityTypesContent = generateEntityTypes(serviceName);

  fs.writeFileSync(path.join(schemasPath, "mcp-types.ts"), mcpTypesContent);
  fs.writeFileSync(
    path.join(schemasPath, `${serviceName}.ts`),
    entityTypesContent
  );

  // Update shared schemas index
  const indexPath = path.join(path.dirname(schemasPath), "index.ts");
  const indexContent = fs.readFileSync(indexPath, "utf8");

  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
  const newExports = `
// ${capitalizedName}-specific types
export * from "./${serviceName}/mcp-types.js";
export * from "./${serviceName}/${serviceName}.js";
`;

  if (!indexContent.includes(`export * from "./${serviceName}/mcp-types.js"`)) {
    fs.writeFileSync(indexPath, indexContent + newExports);
  }
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
  "description": "${capitalizedName} MCP Server - Enterprise-grade ${capitalizedName} integration following Omni MCP patterns",
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
    "@mcp/schemas": "workspace:*",
    "@mcp/utils": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
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
    "enterprise",
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
COPY shared/schemas/package.json ./shared/schemas/
COPY shared/schemas/tsconfig.json ./shared/schemas/
COPY shared/schemas/src/ ./shared/schemas/src/

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
RUN cd shared/schemas && pnpm build
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

Enterprise-grade ${capitalizedName} integration following **Omni MCP Enterprise Pattern**.

## 🏗️ Architecture

This server implements the [Enterprise MCP Server Pattern](../../MCP_SERVER_PATTERN.md) with:

- ✅ Shared type system from \`@mcp/schemas\`
- ✅ Standardized error handling with \`McpResponse<T>\`
- ✅ Enterprise-grade Docker containerization
- ✅ Comprehensive tool/resource/prompt definitions

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
export const ${serviceName.toUpperCase()}_CONFIG = {
  API_KEY: process.env.${serviceName.toUpperCase()}_API_KEY,
  BASE_URL: process.env.${serviceName.toUpperCase()}_BASE_URL || "https://api.${serviceName}.com",
};
\`\`\`

## 🛠️ Implementation

1. **Tools**: Implement your ${serviceName} tools in \`src/mcp-server/tools/${serviceName}-tools.ts\`
2. **Schemas**: Define types in \`shared/schemas/src/${serviceName}/mcp-types.ts\`  
3. **Configuration**: Add environment variables to \`src/config/config.ts\`

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

- [Enterprise MCP Server Pattern](../../MCP_SERVER_PATTERN.md)
- [Shared Schemas](../../shared/schemas/README.md)
- [Development Guide](../../README.md)
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
// Following Enterprise MCP Server Pattern

export const ${upperCaseName}_CONFIG = {
  // API Configuration
  API_KEY: process.env.${upperCaseName}_API_KEY,
  BASE_URL: process.env.${upperCaseName}_BASE_URL || "https://api.${serviceName}.com",
  
  // Server Configuration  
  NAME: "${serviceName}-mcp-server",
  VERSION: "1.0.0",
  
  // Rate Limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: parseInt(process.env.${upperCaseName}_RATE_LIMIT || "60"),
    BURST_LIMIT: parseInt(process.env.${upperCaseName}_BURST_LIMIT || "10"),
  },

  // Timeouts
  TIMEOUTS: {
    REQUEST_TIMEOUT: parseInt(process.env.${upperCaseName}_REQUEST_TIMEOUT || "30000"),
    CONNECTION_TIMEOUT: parseInt(process.env.${upperCaseName}_CONNECTION_TIMEOUT || "10000"),
  },

  // Feature Flags
  FEATURES: {
    ENABLE_CACHING: process.env.${upperCaseName}_ENABLE_CACHING === "true",
    ENABLE_METRICS: process.env.${upperCaseName}_ENABLE_METRICS === "true",
    DEBUG_MODE: process.env.NODE_ENV === "development",
  }
};

// Validation
if (!${upperCaseName}_CONFIG.API_KEY) {
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
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  type ListResourcesRequest,
  type ReadResourceRequest,
  type ListPromptsRequest,
  type GetPromptRequest,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { McpServerInterface, McpResponse } from "@mcp/schemas";
import { ${serviceName.toUpperCase()}_CONFIG } from "../config/config.js";
import { ${capitalizedName}Tools } from "./tools/${serviceName}-tools.js";
import { TOOLS } from "./tools.js";
import { RESOURCES } from "./resources.js";
import { PROMPTS } from "./prompts.js";

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

  const ${serviceName}Tools = new ${capitalizedName}Tools(${serviceName.toUpperCase()}_CONFIG.API_KEY!);

  // Tools handlers
  server.setRequestHandler(
    ListToolsRequestSchema,
    async (request: ListToolsRequest) => {
      return {
        tools: TOOLS,
      };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        let result: McpResponse;
        const toolName = name as keyof ${capitalizedName}Tools;

        if (typeof ${serviceName}Tools[toolName] === "function") {
          result = await (${serviceName}Tools[toolName] as any)(args);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, \`Unknown tool: \${name}\`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const errorResponse: McpResponse = {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(errorResponse, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Resources handlers
  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (request: ListResourcesRequest) => {
      return {
        resources: RESOURCES,
      };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const { uri } = request.params;

      try {
        let result: McpResponse;

        // TODO: Implement resource reading logic
        // Example: if (uri === "${serviceName}://entities") { ... }
        
        throw new McpError(
          ErrorCode.InvalidRequest,
          \`Resource not implemented: \${uri}\`
        );

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new McpError(
          ErrorCode.InternalError,
          \`Failed to read resource: \${errorMessage}\`
        );
      }
    }
  );

  // Prompts handlers
  server.setRequestHandler(
    ListPromptsRequestSchema,
    async (request: ListPromptsRequest) => {
      return {
        prompts: PROMPTS,
      };
    }
  );

  server.setRequestHandler(
    GetPromptRequestSchema,
    async (request: GetPromptRequest) => {
      const { name, arguments: args } = request.params;

      const prompt = PROMPTS.find((p) => p.name === name);
      if (!prompt) {
        throw new McpError(ErrorCode.InvalidRequest, \`Unknown prompt: \${name}\`);
      }

      // TODO: Generate dynamic prompt content based on the prompt name
      let content = \`# \${prompt.description}\\n\\nTODO: Implement prompt content for \${name}\`;

      return {
        description: prompt.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: content,
            },
          },
        ],
      };
    }
  );

  return server;
}
`;
}

function generateTools(serviceName: string): string {
  const upperCaseName = serviceName.toUpperCase();

  return `import { ${upperCaseName}_TOOLS, ToolDefinition } from "@mcp/schemas";

// Use standardized tool definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const TOOLS: readonly ToolDefinition[] = ${upperCaseName}_TOOLS;
`;
}

function generateResources(serviceName: string): string {
  const upperCaseName = serviceName.toUpperCase();

  return `import { ${upperCaseName}_RESOURCES, ResourceDefinition } from "@mcp/schemas";

// Use standardized resource definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const RESOURCES: readonly ResourceDefinition[] = ${upperCaseName}_RESOURCES;
`;
}

function generatePrompts(serviceName: string): string {
  const upperCaseName = serviceName.toUpperCase();

  return `import { ${upperCaseName}_PROMPTS, PromptDefinition } from "@mcp/schemas";

// Use standardized prompt definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const PROMPTS: readonly PromptDefinition[] = ${upperCaseName}_PROMPTS;
`;
}

function generateToolsImplementation(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { 
  McpResponse,
  Create${capitalizedName}Input,
  ${capitalizedName}Result
} from "@mcp/schemas";

// ${capitalizedName} Tools Implementation
// Following Enterprise MCP Server Pattern

export class ${capitalizedName}Tools {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error("${capitalizedName} API key is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.${serviceName}.com";
  }

  // MANDATORY: Use _execute wrapper for consistent error handling
  private async _execute<T = any>(
    toolName: string,
    logic: () => Promise<T>
  ): Promise<McpResponse<T>> {
    console.log(\`Executing tool: \${toolName}\`);
    try {
      const data = await logic();
      return { success: true, data };
    } catch (error: any) {
      console.error(\`Error in \${toolName}:\`, error);
      return { success: false, error: error.message };
    }
  }

  // Example tool implementation - simple placeholders
  async ${serviceName}_search(args: { query?: string; limit?: number } = {}): Promise<McpResponse> {
    return this._execute("${serviceName}_search", async () => {
      // TODO: Implement actual ${serviceName} search logic
      const { query = "", limit = 10 } = args;
      
      // Example API call structure:
      // const response = await fetch(\`\${this.baseUrl}/search?q=\${query}&limit=\${limit}\`, {
      //   headers: {
      //     'Authorization': \`Bearer \${this.apiKey}\`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // const data = await response.json();
      
      return {
        query,
        results: [],
        total: 0,
        message: "TODO: Implement ${serviceName}_search functionality"
      };
    });
  }

  async ${serviceName}_create(args: Create${capitalizedName}Input): Promise<McpResponse<${capitalizedName}Result>> {
    return this._execute("${serviceName}_create", async () => {
      // TODO: Implement actual ${serviceName} creation logic
      const { title, description } = args;
      
      // Example API call:
      // const response = await fetch(\`\${this.baseUrl}/${serviceName}s\`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': \`Bearer \${this.apiKey}\`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ title, description })
      // });
      // const result = await response.json();
      
      const result: ${capitalizedName}Result = {
        id: "placeholder-id",
        title,
        url: \`https://api.${serviceName}.com/entities/placeholder-id\`
      };
      
      return result;
    });
  }

  async ${serviceName}_get(args: { id: string }): Promise<McpResponse> {
    return this._execute("${serviceName}_get", async () => {
      // TODO: Implement actual ${serviceName} retrieval logic
      const { id } = args;
      
      // Example API call:
      // const response = await fetch(\`\${this.baseUrl}/${serviceName}s/\${id}\`, {
      //   headers: {
      //     'Authorization': \`Bearer \${this.apiKey}\`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // const entity = await response.json();
      
      return {
        id,
        title: \`Sample \${id}\`,
        description: "TODO: Fetch from actual API",
        message: "TODO: Implement ${serviceName}_get functionality"
      };
    });
  }
}
`;
}

function generateMcpTypes(serviceName: string): string {
  const upperCaseName = serviceName.toUpperCase();
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { z } from "zod";
import {
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
  McpResponse,
} from "../mcp/types.js";

// ============================================================================
// ${upperCaseName}-SPECIFIC MCP TYPES
// ============================================================================

// ${capitalizedName} Entity Types
export const ${capitalizedName}EntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ${capitalizedName}Entity = z.infer<typeof ${capitalizedName}EntitySchema>;

// ${capitalizedName} Tool Argument Types
export const ${capitalizedName}SearchArgsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
});

export const ${capitalizedName}CreateArgsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const ${capitalizedName}GetArgsSchema = z.object({
  id: z.string().min(1),
});

export type ${capitalizedName}SearchArgs = z.infer<typeof ${capitalizedName}SearchArgsSchema>;
export type ${capitalizedName}CreateArgs = z.infer<typeof ${capitalizedName}CreateArgsSchema>;
export type ${capitalizedName}GetArgs = z.infer<typeof ${capitalizedName}GetArgsSchema>;

// ${capitalizedName} Response Types
export type ${capitalizedName}SearchResponse = McpResponse<{
  results: ${capitalizedName}Entity[];
  total: number;
  query: string;
}>;

export type ${capitalizedName}CreateResponse = McpResponse<${capitalizedName}Entity>;
export type ${capitalizedName}GetResponse = McpResponse<${capitalizedName}Entity>;

// ${capitalizedName} Tool Definitions
export const ${upperCaseName}_TOOLS: readonly ToolDefinition[] = [
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
          description: "Maximum number of results to return",
          minimum: 1,
          maximum: 100,
          default: 10,
        },
      },
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
          description: "Title of the entity",
        },
        description: {
          type: "string",
          description: "Description of the entity",
        },
      },
      required: ["title"],
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
          description: "ID of the entity to retrieve",
        },
      },
      required: ["id"],
    },
  },
] as const;

// ${capitalizedName} Resource Definitions
export const ${upperCaseName}_RESOURCES: readonly ResourceDefinition[] = [
  {
    uri: "${serviceName}://entities",
    name: "${capitalizedName} Entities",
    description: "List of all ${serviceName} entities",
    mimeType: "application/json",
  },
  {
    uri: "${serviceName}://entity/{id}",
    name: "${capitalizedName} Entity",
    description: "Details of a specific ${serviceName} entity",
    mimeType: "application/json",
  },
] as const;

// ${capitalizedName} Prompt Definitions
export const ${upperCaseName}_PROMPTS: readonly PromptDefinition[] = [
  {
    name: "${serviceName}_workflow",
    description: "Standard workflow for working with ${serviceName} entities",
    arguments: [],
  },
  {
    name: "${serviceName}_analysis",
    description: "Analyze ${serviceName} data and provide insights",
    arguments: [
      {
        name: "timeframe",
        description: "Time period for analysis",
        required: false,
      },
    ],
  },
] as const;
`;
}

function generateEntityTypes(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `import { z } from "zod";

// Schema for creating an entity
export const Create${capitalizedName}Schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type Create${capitalizedName}Input = z.infer<typeof Create${capitalizedName}Schema>;

// Schema for the result of creating an entity
export const ${capitalizedName}ResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
});

export type ${capitalizedName}Result = z.infer<typeof ${capitalizedName}ResultSchema>;
`;
}

function generateServiceEnvExample(serviceName: string): string {
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  return `# ${capitalizedName} MCP Server Environment Variables
# Non-sensitive service-specific defaults only.
# Secrets like ${serviceName.toUpperCase()}_API_KEY are defined in secrets/.env.development.local.example

# Optional: Node.js Environment
# NODE_ENV=production

# Optional: Logging Level
# LOG_LEVEL=info

# Optional: Rate Limiting
# ${serviceName.toUpperCase()}_RATE_LIMIT=60
# ${serviceName.toUpperCase()}_BURST_LIMIT=10

# Optional: Timeouts (in milliseconds)
# ${serviceName.toUpperCase()}_REQUEST_TIMEOUT=30000
# ${serviceName.toUpperCase()}_CONNECTION_TIMEOUT=10000

# Optional: Feature Flags
# ${serviceName.toUpperCase()}_ENABLE_CACHING=false
# ${serviceName.toUpperCase()}_ENABLE_METRICS=false

# Currently no non-sensitive service-specific defaults for ${capitalizedName} server.
# Add any service-specific configuration here as needed.
`;
}

async function updateCentralizedSecrets(serviceName: string) {
  const projectRoot = path.resolve(__dirname, "../../../../..");
  const secretsPath = path.join(
    projectRoot,
    "secrets",
    ".env.development.local.example"
  );

  if (!fs.existsSync(secretsPath)) {
    console.log("⚠️  Centralized secrets file not found, skipping update");
    return;
  }

  const upperCaseName = serviceName.toUpperCase();
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  let content = fs.readFileSync(secretsPath, "utf8");

  // Check if service secrets already exist
  if (content.includes(`${upperCaseName}_API_KEY`)) {
    console.log(
      `ℹ️  ${capitalizedName} secrets already exist in centralized secrets file`
    );
    return;
  }

  // Add new service secrets section
  const newSecretsSection = `
# -- ${capitalizedName} MCP Server Secrets --
${upperCaseName}_API_KEY=your-${serviceName}-api-key-goes-here
${upperCaseName}_BASE_URL=https://api.${serviceName}.com`;

  // Append to the file
  content += newSecretsSection;

  fs.writeFileSync(secretsPath, content);
  console.log(
    `✅ Added ${capitalizedName} secrets to centralized secrets file`
  );
}
