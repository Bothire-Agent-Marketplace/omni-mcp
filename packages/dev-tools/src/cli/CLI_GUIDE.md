# 🚀 Omni MCP CLI Guide

A powerful command-line interface for managing and scaffolding MCP (Model Context Protocol) servers.

## 🏗️ Overview

The Omni CLI provides commands to create, list, validate, and remove MCP servers. It enforces the new **HTTP-based, serverless-ready pattern**, ensuring that every new server is consistent, scalable, and easy to maintain.

## 📥 Installation & Usage

The CLI is a workspace tool within the `packages/dev-tools` directory.

```bash
# First time setup, or after changes: build the tool
pnpm build --filter dev-tools

# Run the CLI from the project root
pnpm omni --help
pnpm omni create
pnpm omni list
pnpm omni validate
pnpm omni remove <service-name>
```

## 🛠️ Commands

### 🏗️ `omni create`

Scaffolds a new, production-ready MCP server based on the official HTTP pattern. It interactively prompts for server details.

```bash
pnpm omni create
```

**Features:**

- ✅ Generates a complete directory structure (`handlers.ts`, `http-server.ts`, etc.).
- ✅ Creates `package.json` with necessary dependencies (`express`, `cors`).
- ✅ Produces a multi-stage `Dockerfile` for efficient, secure containerization.
- ✅ Automatically adds the new server to `pnpm-workspace.yaml`, `docker-compose.dev.yml`, and the gateway's `master.config.dev.json`.
- ✅ Installs dependencies automatically.

**Generated Structure:**

```
servers/your-service-mcp-server/
├── src/
│   ├── index.ts              # Entry point (starts HTTP server)
│   ├── config/config.ts      # Environment configuration
│   └── mcp-server/
│       ├── http-server.ts    # Express.js server (transport layer)
│       └── handlers.ts       # Core business logic handlers
├── .env.example
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

### 📋 `omni list`

Lists all MCP servers found in the `servers/` directory.

```bash
# Basic list
pnpm omni list

# Detailed information
pnpm omni list --verbose
```

**Verbose output shows:**

- 📦 Package version
- 🔨 Build status (`dist` folder)
- 🐳 Dockerfile status
- 📂 Filesystem path

### 🔍 `omni validate [service-name]`

Validates that a specific server (or all servers) complies with the HTTP pattern.

```bash
# Validate all servers
pnpm omni validate

# Validate a specific server
pnpm omni validate linear
```

**Validation Checks:**

- ✅ **File Structure**: Presence of `http-server.ts` and `handlers.ts`.
- ✅ **Dependencies**: `express` is listed in `package.json`.
- ✅ **Dockerfile**: A `PORT` is exposed.
- ✅ **Workspace Integration**: Server is configured in `docker-compose.dev.yml`, `master.config.dev.json`, and `pnpm-workspace.yaml`.

### 🗑️ `omni remove <service-name>`

Safely removes an MCP server and de-registers it from all workspace configuration files.

```bash
# Interactive removal (prompts for confirmation)
pnpm omni remove <service-name>

# Force removal without a prompt
pnpm omni remove <service-name> --force
```

**Cleanup Actions:**

- 🗑️ Deletes the server directory.
- 🔧 Removes the service from `docker-compose.dev.yml`.
- 🔧 Removes the server path from `pnpm-workspace.yaml`.
- 🔧 Removes the server entry from `gateway/master.config.dev.json`.
- 📦 Runs `pnpm install` to update the lockfile.

## 🏆 The HTTP Server Pattern

The CLI enforces our new gold standard for MCP servers. For full details, see the [Enterprise MCP Server Pattern: HTTP Edition](MCP_SERVER_PATTERN.md).

**Key Principles:**

1.  **Decoupled Logic**: Business logic lives in `handlers.ts` and is transport-agnostic.
2.  **HTTP Transport**: An `express` server in `http-server.ts` exposes the handlers over the network.
3.  **Health Checks**: A `/health` endpoint is required for gateway monitoring.
4.  **Configuration Driven**: All configuration (ports, API keys) is loaded from environment variables.

## workflow

### Creating a New MCP Server

```bash
# 1. Run the interactive create command
pnpm omni create

# Follow the prompts for service name, port, etc.

# 2. Add API Keys
# Open secrets/.env.development.local and add any new API keys needed by your server's handlers.

# 3. Implement Business Logic
# Open servers/your-service-mcp-server/src/mcp-server/handlers.ts
# and replace the example code with your actual logic.

# 4. Start all services
make dev

# 5. Test your new server through the gateway
curl http://localhost:37373/health | jq
curl -X POST http://localhost:37373/mcp -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "your-service_search"}, "id": 1}'
```

## 🐛 Troubleshooting

### CLI Command Not Found

If you get `pnpm: command not found: omni`, you need to build the CLI tool first.

```bash
pnpm build --filter dev-tools
```

### Validation Errors

Run `pnpm omni validate <service-name>` and check the output. The checks are designed to be clear about what is missing or misconfigured. Common issues are missing files or incorrect entries in workspace configuration files.

## 📈 Migration Guide

### Existing MCP Servers → Enterprise Pattern

1. **Create server-specific types directory**
2. **Move type definitions to server's `types/` directory**
3. **Add \_execute wrapper to tools**
4. **Use McpResponse<T> return types**
5. **Implement hierarchical environment loading**
6. **Validate compliance**

```bash
# Migration validation
make validate-mcp SERVICE=existing-server
# Fix issues shown in validation report
```

---

🎯 **Goal**: Enable teams to rapidly create, manage, and scale 100+ enterprise-grade MCP servers with consistent patterns and zero technical debt.
