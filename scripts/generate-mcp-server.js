#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateMCPServer(serverName, options = {}) {
  const {
    port = 3000,
    description = `${serverName} MCP Server`,
    tools = [],
    resources = [],
    prompts = [],
  } = options;

  const serverDir = join(__dirname, `../apps/${serverName}-mcp-server`);

  if (existsSync(serverDir)) {
    console.error(`Server directory already exists: ${serverDir}`);
    process.exit(1);
  }

  // Create directory structure
  mkdirSync(serverDir, { recursive: true });
  mkdirSync(join(serverDir, "src"), { recursive: true });
  mkdirSync(join(serverDir, "src", "handlers"), { recursive: true });

  // Generate package.json
  const packageJson = {
    name: `@mcp/${serverName}-server`,
    version: "workspace:*",
    description,
    author: "Your Name",
    main: "dist/index.js",
    type: "module",
    exports: {
      ".": "./dist/index.js",
      "./mcp-definition.js": "./dist/mcp-definition.js",
    },
    scripts: {
      build: "tsc",
      clean: "rm -rf dist",
      dev: "tsx --watch src/index.ts",
      start: "node dist/index.js",
      test: "vitest",
      "type-check": "tsc --noEmit",
    },
    dependencies: {
      "@fastify/cors": "^9.0.1",
      "@mcp/capabilities": "workspace:*",
      "@mcp/schemas": "workspace:*",
      "@mcp/utils": "workspace:*",
      fastify: "^4.28.1",
      zod: "^3.25.67",
    },
    devDependencies: {
      "@types/node": "^24.0.8",
      tsx: "^4.20.3",
      typescript: "^5.8.3",
      vitest: "^1.6.0",
    },
    engines: {
      node: ">=18.0.0",
    },
    keywords: [
      "claude",
      serverName,
      "mcp",
      "model-context-protocol",
      "typescript",
    ],
    license: "MIT",
  };

  // Generate tsconfig.json
  const tsconfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      outDir: "./dist",
      rootDir: "./src",
      composite: true,
    },
    include: ["src/**/*.ts"],
    references: [
      { path: "../../packages/capabilities" },
      { path: "../../packages/schemas" },
      { path: "../../packages/utils" },
    ],
    exclude: ["node_modules", "dist"],
  };

  // Generate server definition
  const serverDefinition = `import { MCPServerSchema, type MCPServerDefinition, serverRegistry } from "@mcp/capabilities";

// ${serverName.charAt(0).toUpperCase() + serverName.slice(1)} MCP Server Configuration
export const ${serverName.toUpperCase()}_SERVER: MCPServerDefinition = MCPServerSchema.parse({
  name: "${serverName}",
  port: ${port},
  description: "${description}",
  productionUrl: "https://${serverName}-mcp.vercel.app", // TODO: Update this
  envVar: "${serverName.toUpperCase()}_SERVER_URL",
  tools: [${tools.map((t) => `"${t}"`).join(", ")}],
  resources: [${resources.map((r) => `"${r}"`).join(", ")}],
  prompts: [${prompts.map((p) => `"${p}"`).join(", ")}],
});

// Auto-register the server
serverRegistry.register(${serverName.toUpperCase()}_SERVER);

// Re-export for external use
export { ${serverName.toUpperCase()}_SERVER as default };
`;

  // Generate main index.ts
  const indexTs = `import { FastifyInstance } from "fastify";
import { GatewayHTTPResponse } from "@mcp/schemas";
import { createHTTPServer } from "@mcp/utils/http-server.js";
import { McpLogger } from "@mcp/utils";
import { ${serverName.toUpperCase()}_SERVER } from "./mcp-definition.js";
import { registerHandlers } from "./handlers/index.js";

// Create HTTP server
const server = createHTTPServer({
  port: ${serverName.toUpperCase()}_SERVER.port,
  logger: new McpLogger("${serverName}-mcp-server"),
});

// Register MCP handlers
registerHandlers(server);

// Start server
server.listen({ port: ${serverName.toUpperCase()}_SERVER.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
  console.log(\`${serverName.charAt(0).toUpperCase() + serverName.slice(1)} MCP Server listening at \${address}\`);
});
`;

  // Generate handlers/index.ts
  const handlersIndex = `import { FastifyInstance } from "fastify";
import { MCPRequest, MCPResponse } from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";

export function registerHandlers(server: FastifyInstance) {
  const logger = new McpLogger("${serverName}-handlers");

  // Initialize method (required by MCP protocol)
  server.post("/mcp", async (request, reply) => {
    const mcpRequest = request.body as MCPRequest;
    
    try {
      switch (mcpRequest.method) {
        case "initialize":
          return handleInitialize(mcpRequest);
        case "tools/list":
          return handleToolsList(mcpRequest);
        case "tools/call":
          return handleToolCall(mcpRequest);
        case "resources/list":
          return handleResourcesList(mcpRequest);
        case "resources/read":
          return handleResourceRead(mcpRequest);
        case "prompts/list":
          return handlePromptsList(mcpRequest);
        case "prompts/get":
          return handlePromptGet(mcpRequest);
        default:
          return {
            jsonrpc: "2.0",
            id: mcpRequest.id,
            error: {
              code: -32601,
              message: "Method not found",
              data: \`Unknown method: \${mcpRequest.method}\`
            }
          };
      }
    } catch (error) {
      logger.error("Handler error:", error);
      return {
        jsonrpc: "2.0",
        id: mcpRequest.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  });
}

async function handleInitialize(request: MCPRequest): Promise<MCPResponse> {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo: {
        name: "${serverName}-mcp-server",
        version: "1.0.0"
      }
    }
  };
}

async function handleToolsList(request: MCPRequest): Promise<MCPResponse> {
  // TODO: Implement your tools
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      tools: []
    }
  };
}

async function handleToolCall(request: MCPRequest): Promise<MCPResponse> {
  // TODO: Implement tool execution
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32601,
      message: "Tool not implemented"
    }
  };
}

async function handleResourcesList(request: MCPRequest): Promise<MCPResponse> {
  // TODO: Implement your resources
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      resources: []
    }
  };
}

async function handleResourceRead(request: MCPRequest): Promise<MCPResponse> {
  // TODO: Implement resource reading
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32601,
      message: "Resource not implemented"
    }
  };
}

async function handlePromptsList(request: MCPRequest): Promise<MCPResponse> {
  // TODO: Implement your prompts
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      prompts: []
    }
  };
}

async function handlePromptGet(request: MCPRequest): Promise<MCPResponse> {
  // TODO: Implement prompt retrieval
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32601,
      message: "Prompt not implemented"
    }
  };
}
`;

  // Generate README.md
  const readme = `# ${serverName.charAt(0).toUpperCase() + serverName.slice(1)} MCP Server

${description}

## Installation

\`\`\`bash
pnpm install
\`\`\`

## Development

\`\`\`bash
pnpm dev
\`\`\`

## Building

\`\`\`bash
pnpm build
\`\`\`

## Testing

\`\`\`bash
pnpm test
\`\`\`

## Configuration

Set the following environment variables:

- \`${serverName.toUpperCase()}_SERVER_URL\`: URL for the ${serverName} server in production

## API Documentation

### Tools

${tools.length > 0 ? tools.map((tool) => `- \`${tool}\`: TODO - Add description`).join("\n") : "- No tools defined yet"}

### Resources

${resources.length > 0 ? resources.map((resource) => `- \`${resource}\`: TODO - Add description`).join("\n") : "- No resources defined yet"}

### Prompts

${prompts.length > 0 ? prompts.map((prompt) => `- \`${prompt}\`: TODO - Add description`).join("\n") : "- No prompts defined yet"}
`;

  // Write files
  writeFileSync(
    join(serverDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  writeFileSync(
    join(serverDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2)
  );
  writeFileSync(join(serverDir, "src", "mcp-definition.ts"), serverDefinition);
  writeFileSync(join(serverDir, "src", "index.ts"), indexTs);
  writeFileSync(join(serverDir, "src", "handlers", "index.ts"), handlersIndex);
  writeFileSync(join(serverDir, "README.md"), readme);

  console.log(`✅ Generated ${serverName} MCP Server at ${serverDir}`);
  console.log(`\nNext steps:`);
  console.log(`1. cd apps/${serverName}-mcp-server`);
  console.log(`2. pnpm install`);
  console.log(`3. pnpm dev`);
  console.log(`4. Update the server definition in src/mcp-definition.ts`);
  console.log(`5. Implement handlers in src/handlers/index.ts`);
}

// CLI interface
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node generate-mcp-server.js <server-name> [options]");
  console.error("Example: node generate-mcp-server.js github --port 3002");
  process.exit(1);
}

const serverName = args[0];
const options = {};

// Parse options
for (let i = 1; i < args.length; i += 2) {
  const key = args[i].replace("--", "");
  const value = args[i + 1];

  if (key === "port") {
    options.port = parseInt(value);
  } else if (key === "description") {
    options.description = value;
  } else if (key === "tools") {
    options.tools = value.split(",");
  } else if (key === "resources") {
    options.resources = value.split(",");
  } else if (key === "prompts") {
    options.prompts = value.split(",");
  }
}

generateMCPServer(serverName, options);
