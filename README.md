# 🌟 Omni MCP

> Enterprise-grade MCP (Model Context Protocol) server management platform with automatic scaling, smart routing, and developer-friendly tooling.

## 🚀 Quick Start (Local Development)

```bash
# 1. Clone and install
git clone <repo-url>
cd omni
pnpm install

# 2. Configure environment variables
# Copy .env.example to .env and fill in any necessary values
cp .env.example .env

# 3. Start all services
pnpm dev

# 4. Create your first MCP server
pnpm omni create
```

Your gateway will be running at **http://localhost:37373** 🎉

## ☁️ Deployment (Vercel)

This monorepo is configured for deployment on [Vercel](https://vercel.com). Each application in the `apps/` directory should be deployed as a separate Vercel project.

1.  **Import Project**: In the Vercel dashboard, click "Add New... -> Project" and import your Git repository.
2.  **Select Root Directory**: Vercel will detect the monorepo. When prompted for the "Root Directory", select the specific application you want to deploy (e.g., `apps/gateway`).
3.  **Configure Settings**: Vercel will automatically detect the correct build settings for a Node.js application.
4.  **Environment Variables**: Add any required environment variables from your `.env` file to the Vercel project settings.
5.  **Deploy**: Click "Deploy".
6.  **Repeat**: Repeat this process for each application in the `apps` directory that you wish to deploy.

Once deployed, you will need to update the `url` for each server in the `apps/gateway/master.config.dev.json` file to point to the correct Vercel deployment URL (e.g., `https://my-linear-server.vercel.app`).

## 🏗️ What is Omni MCP?

Omni is a **production-ready MCP platform** that lets you:

- 🔄 **Gateway Router**: Single entry point that routes requests to multiple MCP servers
- 🛠️ **CLI Toolkit**: Create, manage, and validate MCP servers with `pnpm omni`
- ☁️ **Vercel Ready**: Optimized for serverless deployment on Vercel.
- 📈 **Auto-Scaling**: HTTP-based microservices architecture
- ✅ **Enterprise Patterns**: Validation, health checks, and best practices built-in

## 🎯 Core Commands

```bash
# Development
pnpm dev              # Start all services with hot reload

# MCP Server Management
pnpm omni create      # Create a new MCP server (interactive)
pnpm omni list        # List all servers
pnpm omni validate    # Check server compliance
pnpm omni remove <name> --force  # Remove a server

# Building
pnpm build            # Build all packages
```

## 📂 Project Structure

```
omni/
├── apps/                 # All applications
│   ├── gateway/          # MCP Gateway (routes requests)
│   └── ...               # Your MCP servers
├── packages/             # Shared code
│   ├── dev-tools/        # CLI toolkit (pnpm omni)
│   └── ...               # Shared utilities, schemas, etc.
├── docs/                 # Detailed documentation
└── vercel.json           # Vercel deployment configuration
```

## 🔌 Architecture

- **Gateway**: Routes MCP requests to appropriate serverless functions.
- **MCP Servers**: Individual serverless functions, each with a public URL.
- **Smart Routing**: The gateway uses a configuration file to map requests to the correct serverless deployment.
- **Hot Reload**: Changes auto-reload in development with `pnpm dev`.

## 📚 Documentation

- **[CLI Guide](docs/CLI_GUIDE.md)** - Complete CLI reference
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and patterns
- **[MCP Server Pattern](docs/MCP_SERVER_PATTERN.md)** - Best practices for servers

## 🧪 Testing Your Setup

```bash
# Health check
curl http://localhost:37373/health

# List available tools
curl http://localhost:37373/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'

# Test Linear integration (if configured)
curl http://localhost:37373/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {"name": "linear_get_teams"},
    "id": 1
  }'
```

## 🎨 Features

- ✅ **Auto Port Management** - CLI automatically assigns unique ports
- ✅ **Validation System** - Ensures all servers follow best practices
- ✅ **Health Monitoring** - Built-in health checks and monitoring
- ✅ **TypeScript First** - Full type safety across the platform
- ✅ **Developer Experience** - Hot reload, clear logs, easy debugging

---

**Ready to build something awesome?** Start with `pnpm omni create` 🚀
