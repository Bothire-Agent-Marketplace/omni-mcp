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

export const create = new Command("create")
  .description("Create a new MCP server.")
  .action(async () => {
    const responses = await prompts([
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
        message: "Which network port should this server run on?",
        initial: 3002,
        validate: (value: number) =>
          value > 1024 && value < 65535
            ? true
            : "Port must be between 1025 and 65534",
      },
    ]);

    if (!responses.serviceName || !responses.port) {
      logError("Server name and port are required. Aborting.");
      return;
    }

    const { serviceName, description, author, port } = responses;
    const serverId = `${serviceName}-mcp-server`;
    const serverPath = path.join("servers", serverId);

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
          path.join(serverPath, "Dockerfile"),
          getDockerfileContent(serviceName)
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
          getConfigTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/http-server.ts"),
          getHttpServerTsContent(serviceName)
        ),
        fs.writeFile(
          path.join(serverPath, "src/mcp-server/handlers.ts"),
          getHandlersTsContent()
        ),
      ];
      await Promise.all(fileCreationTasks);
      log("✅ Server files created.");

      // 3. Update master config
      await updateMasterConfig(serviceName, description, port);
      log("✅ Gateway config (master.config.dev.json) updated.");

      // 4. Update Docker Compose
      await updateDockerCompose(serviceName, serverId, port);
      log("✅ Docker Compose (docker-compose.dev.yml) updated.");

      // 5. Update pnpm-workspace.yaml
      await updatePnpmWorkspace(serverPath);
      log("✅ PNPM workspace (pnpm-workspace.yaml) updated.");

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
      extends: "../../tsconfig.base.json",
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

const getConfigTsContent = (name: string) => `
import { loadEnvHierarchy } from "@mcp/utils";

const env = loadEnvHierarchy("${name}");

export const CONFIG = {
  SERVICE_NAME: "${name}-mcp-server",
  NODE_ENV: env.NODE_ENV || "development",
  LOG_LEVEL: env.LOG_LEVEL || "info",
  PORT: parseInt(env.PORT || "3001", 10),

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
import express, { Express } from "express";
import cors from "cors";
import { createMcpLogger } from "@mcp/utils";
import * as handlers from "./handlers.js";
import { CONFIG } from "../config/config.js";

const logger = createMcpLogger(\`\${CONFIG.SERVICE_NAME}-http\`);

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
  app.post("/mcp", async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== "2.0" || !method || method !== "tools/call") {
      return res.status(400).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" },
      });
    }

    const toolName = params?.name;
    const handler = handlerMap[toolName];

    if (!handler) {
      return res.status(404).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: \`Method not found: \${toolName}\` },
      });
    }

    try {
      const result = await handler(params?.arguments || {});
      res.json({ jsonrpc: "2.0", id, result });
    } catch (error: any) {
      logger.error("Handler error", { toolName, error: error.message });
      res.status(500).json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error.message,
        },
      });
    }
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

const ExampleSearchSchema = z.object({
  query: z.string().min(1),
});

export async function handleExampleSearch(params: unknown) {
  const parsedParams = ExampleSearchSchema.safeParse(params);

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

const getDockerfileContent = (name: string) => `
# Use the official builder image from the linear-mcp-server
# This ensures a consistent build environment for all our servers
FROM omni/linear-mcp-server:builder AS builder

# Copy the source code for this specific server
# We assume the context is the root of the monorepo
COPY servers/${name}-mcp-server/ ./servers/${name}-mcp-server/

# Build the TypeScript code
# This relies on the builder having all workspace dependencies installed
RUN cd servers/${name}-mcp-server && pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy dependency manifests for this server
COPY servers/${name}-mcp-server/package.json ./

# Install only production dependencies for this server
# Using 'npm' because it's simpler and doesn't require the full workspace setup
RUN npm install --omit=dev

# Copy built code and production node_modules from builder stage
COPY --from=builder /app/servers/${name}-mcp-server/dist ./dist
# We need to copy the shared utils dist code as well
# This path is based on the builder image's structure
COPY --from=builder /app/shared/utils/dist ./shared/utils/dist
COPY --from=builder /app/shared/utils/package.json ./shared/utils/

# Expose the port the server will run on
# The actual port is controlled by the .env file, but this is good practice
EXPOSE 3001

# Command to run the service
# The PORT can be overridden by docker-compose environment variables
CMD ["node", "dist/index.js"]
`;

// =============================================================================
// CONFIGURATION FILE UPDATERS
// =============================================================================

async function updateMasterConfig(
  serviceName: string,
  description: string,
  port: number
) {
  const configPath = "gateway/master.config.dev.json";
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
      dockerfile: `servers/${serverId}/Dockerfile`,
      target: "builder",
    },
    container_name: `omni-${serviceName}-mcp-server`,
    env_file: [
      "../.env",
      `../servers/${serverId}/.env`,
      "../secrets/.env.development.local",
    ],
    environment: ["NODE_ENV=development", "LOG_LEVEL=debug", `PORT=${port}`],
    volumes: [
      `../servers/${serverId}/src:/app/servers/${serverId}/src:ro`,
      `../servers/${serverId}/package.json:/app/servers/${serverId}/package.json:ro`,
      "../shared:/app/shared:ro",
    ],
    command: ["sh", "-c", `cd servers/${serverId} && pnpm dev`],
    ports: [
      `${port}:${port}`,
      // Add a unique debug port
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
