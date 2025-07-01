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

  // Check master.config.dev.json for used ports
  try {
    const masterConfigPath = "apps/gateway/master.config.dev.json";
    if (fs.existsSync(masterConfigPath)) {
      const config = await getJson(masterConfigPath);
      for (const server of Object.values(config.servers || {})) {
        const serverConfig = server as any;
        if (serverConfig.url) {
          const match = serverConfig.url.match(/:(\d+)/);
          if (match) {
            usedPorts.add(parseInt(match[1], 10));
          }
        }
      }
      // Gateway port
      if (config.gateway?.port) {
        usedPorts.add(config.gateway.port);
      }
    }
  } catch (error) {
    console.warn("Could not read master.config.dev.json:", error);
  }

  // Check docker-compose.dev.yml for used ports
  try {
    const composePath = "deployment/docker-compose.dev.yml";
    if (fs.existsSync(composePath)) {
      const composeContent = await fs.readFile(composePath, "utf8");
      const compose = yaml.load(composeContent) as any;

      for (const service of Object.values(compose.services || {})) {
        const serviceConfig = service as any;

        // Check environment PORT
        if (serviceConfig.environment) {
          for (const env of serviceConfig.environment) {
            if (typeof env === "string" && env.startsWith("PORT=")) {
              const port = parseInt(env.split("=")[1], 10);
              if (!isNaN(port)) {
                usedPorts.add(port);
              }
            }
          }
        }

        // Check ports mapping
        if (serviceConfig.ports) {
          for (const portMapping of serviceConfig.ports) {
            if (typeof portMapping === "string") {
              const [hostPort] = portMapping.split(":");
              const port = parseInt(hostPort, 10);
              if (!isNaN(port)) {
                usedPorts.add(port);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn("Could not read docker-compose.dev.yml:", error);
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
  .action(async () => {
    // Find the next available port
    const nextPort = await findNextAvailablePort();

    const responses = await prompts(
      [
        {
          type: "text",
          name: "serviceName",
          message: "What is the name of the service? (e.g., 'linear', 'jira')",
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

      // 3. Update master config
      await updateMasterConfig(serviceName, description, port);
      log("✅ Gateway config (master.config.dev.json) updated.");

      // 4. Update Docker Compose (REMOVED)
      // await updateDockerCompose(serviceName, serverId, port);
      // log("✅ Docker Compose (docker-compose.dev.yml) updated.");

      // 5. Update pnpm-workspace.yaml (No longer needed with wildcard path)
      // await updatePnpmWorkspace(serverPath);
      // log("✅ PNPM workspace (pnpm-workspace.yaml) updated.");

      // 6. Install dependencies
      log("📦 Installing dependencies with pnpm...");
      await runCommand("pnpm", ["install"], {
        stdio: "inherit",
      });

      logSuccess(`\n🎉 MCP server '${serverId}' created successfully!`);
      logWarning(`\nNext steps:
1. Update 'secrets/.env.development.local' with any required API keys for '${serviceName}'.
2. Implement your tool logic in '${serverPath}/src/mcp-server/handlers.ts'.
3. Run 'make dev' to start the new server alongside the gateway.
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
        "@modelcontextprotocol/sdk": "^0.5.0",
        cors: "^2.8.5",
        express: "^4.19.2",
        zod: "^3.23.8",
      },
      devDependencies: {
        "@types/cors": "^2.8.17",
        "@types/express": "^4.17.21",
        "@types/node": "^20.11.24",
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
2.  **Run with Docker**: The recommended way to run this server is via the root \`docker-compose.dev.yml\`.
    \`\`\`bash
    make dev
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
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";
import { CONFIG } from "../config/config.js";

const logger = createMcpLogger(\`\${CONFIG.SERVICE_NAME}-http\`);

// Utility function to wrap async route handlers for cleaner error handling
const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Map MCP tool names to their handler functions.
const handlerMap: Record<string, (params: any) => Promise<any>> = {
  "${name}_search": handlers.handleExampleSearch,
};

export function createHttpServer(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Main MCP endpoint for tool calls
  app.post(
    "/mcp",
    asyncHandler(async (req: Request, res: Response) => {
      const { jsonrpc, method, params, id } = req.body;

      if (jsonrpc !== "2.0" || !method || method !== "tools/call") {
        res.status(400).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32600, message: "Invalid Request" },
        });
        return;
      }

      const toolName = params?.name;
      const handler = handlerMap[toolName];

      if (!handler) {
        res.status(404).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: \`Method not found: \${toolName}\` },
        });
        return;
      }

      const result = await handler(params?.arguments || {});
      res.json({ jsonrpc: "2.0", id, result });
    })
  );

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: err.message,
      },
    });
  });

  return app;
}

export function startHttpServer(port: number) {
  const app = createHttpServer();

  app.listen(port, () => {
    logger.info(\`🚀 ${name} MCP HTTP server listening on port \${port}\`);
    logger.info(\`📋 Health check: http://localhost:\${port}/health\`);
    logger.info(\`🔌 MCP endpoint: http://localhost:\${port}/mcp\`);
  });
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

async function updateMasterConfig(
  serviceName: string,
  description: string,
  port: number
) {
  const configPath = "apps/gateway/master.config.dev.json";
  const config = await getJson(configPath);

  if (config.servers[serviceName]) {
    logWarning(
      `Server '${serviceName}' already exists in ${configPath}. Skipping update.`
    );
    return;
  }

  config.servers[serviceName] = {
    type: "mcp",
    description: description,
    url: `http://${serviceName}-mcp-server:${port}`,
    capabilities: [
      "tools/list",
      "tools/call",
      "resources/list",
      "resources/read",
      "prompts/list",
      "prompts/get",
    ],
  };

  await writeJson(configPath, config);
}

// No longer needed with wildcard workspace path
/*
async function updatePnpmWorkspace(serverPath: string) {
  const workspacePath = "pnpm-workspace.yaml";
  const workspaceConfig = yaml.load(fs.readFileSync(workspacePath, "utf8")) as {
    packages: string[];
  };

  if (!workspaceConfig.packages.includes(serverPath)) {
    workspaceConfig.packages.push(serverPath);
    fs.writeFileSync(workspacePath, yaml.dump(workspaceConfig));
  }
}
*/

/*
async function updateDockerCompose(
  serviceName: string,
  serverId: string,
  port: number
) {
  const composePath = "deployment/docker-compose.dev.yml";
  const composeConfig = yaml.load(fs.readFileSync(composePath, "utf8")) as any;

  if (composeConfig.services[serverId]) {
    logWarning(
      `Service '${serverId}' already exists in ${composePath}. Skipping update.`
    );
    return;
  }

  composeConfig.services[serverId] = {
    build: {
      context: "..",
      dockerfile: `apps/${serverId}/Dockerfile`,
      target: "builder",
    },
    container_name: `omni-${serviceName}-mcp-server`,
    env_file: [
      "../.env",
      `../apps/${serverId}/.env`,
      "../secrets/.env.development.local",
    ],
    environment: ["NODE_ENV=development", "LOG_LEVEL=debug", `PORT=${port}`],
    volumes: [
      `../apps/${serverId}/src:/app/apps/${serverId}/src:ro`,
      `../apps/${serverId}/package.json:/app/apps/${serverId}/package.json:ro`,
      "../packages:/app/packages:ro",
    ],
    command: ["sh", "-c", `cd apps/${serverId} && pnpm dev`],
    ports: [
      `${port}:${port}`,
      // Add a unique debug port (port + 1000 to avoid conflicts)
      `${port + 1000}:9229`,
    ],
    networks: ["mcp-network"],
    healthcheck: {
      test: ["CMD", "curl", "-f", `http://localhost:${port}/health`],
      interval: "10s",
      timeout: "3s",
      retries: 3,
      start_period: "10s",
    },
  };

  // Add dependency to gateway
  if (
    composeConfig.services["mcp-gateway"] &&
    composeConfig.services["mcp-gateway"].depends_on
  ) {
    composeConfig.services["mcp-gateway"].depends_on.push(serverId);
  } else {
    logWarning(
      `Could not find mcp-gateway service in ${composePath} to add depends_on.`
    );
  }

  fs.writeFileSync(
    composePath,
    yaml.dump(composeConfig, { indent: 2, lineWidth: -1 })
  );
}
*/
