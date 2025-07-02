import { Command } from "commander";
import prompts from "prompts";
import {
  getJson,
  writeJson,
  runCommand,
  log,
  logError,
  logSuccess,
  logWarning,
} from "../utils.js";
import path from "path";
import fs from "fs-extra";
import yaml from "js-yaml";

// Helper function to find the next available port
async function findNextAvailablePort(): Promise<number> {
  const usedPorts = new Set<number>();

  // Check packages/utils/src/env.ts for used ports
  try {
    const envTsPath = "packages/utils/src/env.ts";
    if (fs.existsSync(envTsPath)) {
      const content = await fs.readFile(envTsPath, "utf8");
      const portRegex = /port:\s*(\d+)|url:\s*".*?:(\d+)"/g;
      let match;
      while ((match = portRegex.exec(content)) !== null) {
        if (match[1]) {
          usedPorts.add(parseInt(match[1], 10));
        }
        if (match[2]) {
          usedPorts.add(parseInt(match[2], 10));
        }
      }
    }
  } catch (error) {
    console.warn("Could not read packages/utils/src/env.ts:", error);
  }

  // Find next available port starting from 3001
  let port = 3001;
  while (usedPorts.has(port)) {
    port++;
  }

  return port;
}

export const create = new Command("create")
  .description("Create a new MCP server.")
  .option("--test", "Run in test mode with predefined answers")
  .action(async (options) => {
    // Find the next available port
    const nextPort = await findNextAvailablePort();

    let responses;

    if (options.test) {
      responses = {
        serviceName: "test-server",
        description: "A test server.",
        author: "Gemini",
        port: nextPort,
      };
      log("🧪 Running in test mode with predefined answers...");
    } else {
      responses = await prompts(
        [
          {
            type: "text",
            name: "serviceName",
            message:
              "What is the name of the service? (e.g., 'linear', 'jira')",
            validate: (value: string) =>
              /^[a-z0-9-]+$/.test(value)
                ? true
                : "Please use lowercase letters, numbers, and hyphens only.",
          },
          {
            type: "text",
            name: "description",
            message: "Provide a short description of the server.",
          },
          {
            type: "text",
            name: "author",
            message: "Who is the author of this server?",
          },
          {
            type: "number",
            name: "port",
            message: `Which network port should this server run on? (suggested: ${nextPort})`,
            initial: nextPort,
            validate: (value: number) =>
              value > 1024 && value < 65535
                ? true
                : "Port must be between 1025 and 65534",
          },
        ],
        {
          onCancel: () => {
            logError("Operation cancelled by user.");
            process.exit(1);
          },
        }
      );
    }

    if (!responses.serviceName || !responses.port) {
      logError("Server name and port are required. Aborting.");
      return;
    }

    const { serviceName, description, author, port } = responses;
    const serverId = `${serviceName}-mcp-server`;
    const serverPath = path.join("apps", serverId);

    if (fs.existsSync(serverPath)) {
      logError(`A server already exists at ${serverPath}. Aborting.`);
      return;
    }

    log(`🚀 Creating new MCP server at ${serverPath}...`);

    try {
      // 1. Create directory structure
      fs.ensureDirSync(path.join(serverPath, "src/mcp-server"));
      fs.ensureDirSync(path.join(serverPath, "src/config"));
      log("✅ Directory structure created.");

      // 2. Create files
      const fileCreationTasks = [
        fs.writeFile(
          path.join(serverPath, "package.json"),
          getPackageJsonContent(serviceName, author)
        ),
        fs.writeFile(
          path.join(serverPath, "tsconfig.json"),
          getTsConfigContent()
        ),
        fs.writeFile(
          path.join(serverPath, ".env.example"),
          getEnvExampleContent(port)
        ),
        fs.writeFile(
          path.join(serverPath, "README.md"),
          getReadmeContent(serviceName, description)
        ),
        fs.writeFile(
          path.join(serverPath, "src/index.ts"),
          getIndexTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/config/config.ts"),
          getConfigTsContent(serviceName, port)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/http-server.ts"),
          getHttpServerTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/handlers.ts"),
          getHandlersTsContent()
        ),
        // MCP SDK Pattern Files
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/server.ts"),
          getServerTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/tools.ts"),
          getToolsTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/resources.ts"),
          getResourcesTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/prompts.ts"),
          getPromptsTsContent(serviceName)
        ),
      ];
      await Promise.all(fileCreationTasks);
      log("✅ Server files created.");

      // 3. Update packages/utils/src/env.ts configuration
      await updateEnvTsConfig(serviceName, description, port);
      log("✅ Server configuration added to packages/utils/src/env.ts.");

      // 4. Install dependencies
      log("📦 Installing dependencies with pnpm...");
      await runCommand("pnpm", ["install"], {
        stdio: "inherit",
      });

      logSuccess(`\n🎉 MCP server '${serverId}' created successfully!`);
      logWarning(`\nNext steps:
1. Update 'secrets/.env.development.local' with any required API keys for '${serviceName}'.
2. Implement your tool logic in '${serverPath}/src/mcp-server/handlers.ts'.
3. Run 'pnpm dev' to start the new server alongside the gateway.
`);
    } catch (error) {
      logError(
        `An error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      log("🧹 Cleaning up created directories...");
      fs.removeSync(serverPath);
    }
  });

// =============================================================================
// FILE CONTENT GENERATORS
// =============================================================================

const getPackageJsonContent = (name: string, author: string) =>
  JSON.stringify(
    {
      name: `@mcp/${name}-server`,
      version: "1.0.0",
      private: true,
      main: "dist/index.js",
      author,
      scripts: {
        build: "tsc",
        start: "node dist/index.js",
        dev: "tsx src/index.ts",
        clean: "rm -rf dist",
        "type-check": "tsc --noEmit",
      },
      dependencies: {
        "@mcp/utils": "workspace:*",
        "@fastify/cors": "^9.0.1",
        fastify: "^4.28.1",
        zod: "^3.23.8",
      },
      devDependencies: {
        "@types/node": "^20.11.24",
        "@types/cors": "^2.8.17",
        "@types/express": "^4.17.21",
        "@types/fastify": "^4.28.1",
        tsx: "^4.7.1",
        typescript: "^5.3.3",
      },
    },
    null,
    2
  );

const getTsConfigContent = () =>
  JSON.stringify(
    {
      extends: "../../../tsconfig.base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist"],
    },
    null,
    2
  );

const getEnvExampleContent = (port: number) => `
# The port this server will listen on.
PORT=${port}

# Service-specific environment variables
# Example:
# SERVICE_API_KEY=your_api_key_here
`;

const getReadmeContent = (name: string, description: string) => `
# ${name.charAt(0).toUpperCase() + name.slice(1)} MCP Server

> ${description}

## 🚀 Running the Server

This server runs as a standalone HTTP microservice and is managed by the main MCP Gateway.

1.  **Environment Variables**: Create a \`.env\` file in this directory or add the required variables to the root \`secrets/.env.development.local\` file. See \`.env.example\` for required variables.
2.  **Run with Gateway**: The recommended way to run this server is via the gateway.
    \`\`\`bash
    pnpm dev
    \`\`\`
3.  **Run Standalone (for debugging)**:
    \`\`\`bash
    pnpm dev
    \`\`\`

## API

-   **Health Check**: \`GET /health\`
-   **MCP Endpoint**: \`POST /mcp\`
`;

const getIndexTsContent = (name: string) => `
import { createMcpLogger } from "@mcp/utils";
import { startHttpServer } from "./mcp-server/http-server.js";
import { CONFIG } from "./config/config.js";

const logger = createMcpLogger(CONFIG.SERVICE_NAME);

logger.info(\`MCP server starting up in \${CONFIG.NODE_ENV} mode...\`);

startHttpServer(CONFIG.PORT);
`;

const getConfigTsContent = (name: string, port: number) => `
import { loadEnvHierarchy } from "@mcp/utils";

const env = loadEnvHierarchy("${name}");

export const CONFIG = {
  SERVICE_NAME: "${name}-mcp-server",
  NODE_ENV: env.NODE_ENV || "development",
  LOG_LEVEL: env.LOG_LEVEL || "info",
  PORT: parseInt(env.PORT || "${port}", 10),

  // TODO: Add your service-specific environment variables here
  // EXAMPLE_API_KEY: env.EXAMPLE_API_KEY,
} as const;

// Example validation:
// if (CONFIG.NODE_ENV !== 'development' && !CONFIG.EXAMPLE_API_KEY) {
//   console.error(\`❌ EXAMPLE_API_KEY environment variable is required for ${name}\`);
//   process.exit(1);
// }
`;

const getHttpServerTsContent = (name: string) => `
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";
import { CONFIG } from "../config/config.js";

const logger = createMcpLogger(\`\${CONFIG.SERVICE_NAME}-http\`);

// Map MCP tool names to their handler functions.
const handlerMap: Record<string, (params: any) => Promise<any>> = {
  "\${name}_search": handlers.handleExampleSearch,
};

export function createHttpServer(): FastifyInstance {
  const server = fastify({ logger: false });

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

  server.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return { status: "ok" };
    }
  );

  server.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const { jsonrpc, method, params, id } = request.body as any;

    if (jsonrpc !== "2.0" || method !== "tools/call") {
      reply.status(400).send({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
      return;
    }

    const toolName = params?.name;
    const handler = handlerMap[toolName];

    if (!handler) {
      reply.status(404).send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: \`Method not found: \${toolName}\` },
      });
      return;
    }

    const result = await handler(params?.arguments || {});
    return { jsonrpc: "2.0", id, result };
  });

  return server;
}

export function startHttpServer(port: number) {
  const server = createHttpServer();

  server.listen({ port, host: "0.0.0.0" }).catch((err) => {
    logger.error("Error starting server", err);
    process.exit(1);
  });

  logger.info(\`🚀 \${name} MCP HTTP server listening on port \${port}\`);
  logger.info(\`📋 Health check: http://localhost:\${port}/health\`);
  logger.info(\`🔌 MCP endpoint: http://localhost:\${port}/mcp\`);
}
`;

const getHandlersTsContent = () => `
import { z } from "zod";

// Example Input Schema
export const ExampleSearchInputSchema = z.object({
  query: z.string().min(1),
});

export async function handleExampleSearch(params: unknown) {
  const parsedParams = ExampleSearchInputSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new Error(\`Invalid parameters: \${parsedParams.error.message}\`);
  }

  const { query } = parsedParams.data;

  // TODO: Replace with your actual business logic
  console.log(\`Searching with query: \${query}\`);
  const results = [
    { id: "1", title: \`First result for '\${query}'\` },
    { id: "2", title: \`Second result for '\${query}'\` },
  ];

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}
`;

// MCP SDK Pattern Content Generators
const getServerTsContent = (name: string) => `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setup${
  name.charAt(0).toUpperCase() + name.slice(1)
}Tools } from "./tools.js";
import { setup${
  name.charAt(0).toUpperCase() + name.slice(1)
}Resources } from "./resources.js";
import { setup${
  name.charAt(0).toUpperCase() + name.slice(1)
}Prompts } from "./prompts.js";

// ============================================================================
// OFFICIAL MCP SDK PATTERN - Clean & Simple Server Setup
// ============================================================================

export function create${
  name.charAt(0).toUpperCase() + name.slice(1)
}McpServer() {
  // Create the MCP server
  const server = new McpServer({
    name: "@mcp/${name}-server",
    version: "1.0.0",
  });

  // Setup all ${name} functionality
  setup${name.charAt(0).toUpperCase() + name.slice(1)}Tools(server);
  setup${name.charAt(0).toUpperCase() + name.slice(1)}Resources(server);
  setup${name.charAt(0).toUpperCase() + name.slice(1)}Prompts(server);

  return server;
}

// Entry point for stdio transport
export async function main() {
  const server = create${
    name.charAt(0).toUpperCase() + name.slice(1)
  }McpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
`;

const getToolsTsContent = (name: string) => `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  // Handlers
  handleExampleSearch,

  // Schemas
  ExampleSearchInputSchema,
} from "./handlers.js";

// This object centralizes the metadata for all tools.
const ToolMetadata = {
  ${name}_search: {
    title: "${name.charAt(0).toUpperCase() + name.slice(1)} Search",
    description: "Search ${name} with optional filters",
    inputSchema: ExampleSearchInputSchema.shape,
  },
};

export function setup${
  name.charAt(0).toUpperCase() + name.slice(1)
}Tools(server: McpServer) {
  // Register all tools using a loop for consistency and maintainability.
  server.registerTool(
    "${name}_search",
    ToolMetadata.${name}_search,
    handleExampleSearch
  );
}
`;

const getResourcesTsContent = (name: string) => `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ============================================================================
// ${name.toUpperCase()} RESOURCES - Clean MCP SDK Pattern
// ============================================================================

export function setup${
  name.charAt(0).toUpperCase() + name.slice(1)
}Resources(server: McpServer) {
  // TODO: Add your resources here
  
  // Example resource:
  // server.registerResource(
  //   "${name}-data",
  //   "${name}://data",
  //   {
  //     title: "${name.charAt(0).toUpperCase() + name.slice(1)} Data",
  //     description: "Access to ${name} data",
  //     mimeType: "application/json",
  //   },
  //   async (uri: any) => {
  //     return {
  //       contents: [
  //         {
  //           uri: uri.href,
  //           text: JSON.stringify({ message: "Hello from ${name}!" }, null, 2),
  //         },
  //       ],
  //     };
  //   }
  // );
}
`;

const getPromptsTsContent = (name: string) => `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ============================================================================
// ${name.toUpperCase()} PROMPTS - Clean MCP SDK Pattern
// ============================================================================

export function setup${
  name.charAt(0).toUpperCase() + name.slice(1)
}Prompts(server: McpServer) {
  // TODO: Add your prompts here
  
  // Example prompt:
  // server.registerPrompt(
  //   "${name}_workflow",
  //   {
  //     title: "${name.charAt(0).toUpperCase() + name.slice(1)} Workflow",
  //     description: "Step-by-step workflow for working with ${name}",
  //     argsSchema: {
  //       context: z
  //         .string()
  //         .optional()
  //         .describe("Additional context for the workflow"),
  //     },
  //   },
  //   ({ context }) => ({
  //     messages: [
  //       {
  //         role: "user",
  //         content: {
  //           type: "text",
  //           text: \`Help me work with ${name}\${context ? \` in the context of: \${context}\` : ""}. Please guide me through the process step by step.\`,
  //         },
  //       },
  //     ],
  //   })
  // );
}
`;

// =============================================================================
// CONFIGURATION FILE UPDATERS
// =============================================================================

async function updateEnvTsConfig(
  serviceName: string,
  description: string,
  port: number
) {
  const envTsPath = path.resolve(process.cwd(), "packages/utils/src/env.ts");

  if (!fs.existsSync(envTsPath)) {
    throw new Error(`Could not find ${envTsPath}`);
  }

  let content = await fs.readFile(envTsPath, "utf8");

  // Create the server configuration object
  const serverConfig = `    ${serviceName}: {
      type: "mcp",
      url: "http://localhost:${port}",
      capabilities: [
        "${serviceName}_search",
      ],
      description: "${description}",
      healthCheckInterval: 15000,
      requiresAuth: false,
      maxRetries: 1,
    },`;

  const productionServerConfig = `      ${serviceName}: {
        type: "mcp",
        url: process.env.${serviceName.toUpperCase()}_SERVER_URL || "https://${serviceName}-mcp.vercel.app",
        capabilities: [
          "${serviceName}_search",
        ],
        description: "${description}",
        healthCheckInterval: 30000,
        requiresAuth: true,
        maxRetries: 3,
      },`;

  // Add to development configuration
  const devReturnMatch = content.match(
    /(\/\/ Development configuration\s*\n\s*return\s*\{[^}]*)\s*\};/s
  );
  if (devReturnMatch) {
    const beforeClosing = devReturnMatch[1];
    const replacement = beforeClosing + "\n" + serverConfig + "\n  };";
    content = content.replace(devReturnMatch[0], replacement);
  } else {
    throw new Error(
      "Could not find development configuration return statement in env.ts"
    );
  }

  // Add to production configuration
  const prodReturnMatch = content.match(
    /(if \(env === "production"\) \{\s*\/\/ Production URLs[^}]*return\s*\{[^}]*)\s*\};/s
  );
  if (prodReturnMatch) {
    const beforeClosing = prodReturnMatch[1];
    const replacement =
      beforeClosing + "\n" + productionServerConfig + "\n    };";
    content = content.replace(prodReturnMatch[0], replacement);
  } else {
    throw new Error(
      "Could not find production configuration return statement in env.ts"
    );
  }

  await fs.writeFile(envTsPath, content);
}
