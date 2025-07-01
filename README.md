# 🌟 Omni MCP

> Enterprise-grade MCP (Model Context Protocol) server management platform with automatic scaling, smart routing, and developer-friendly tooling.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd omni
pnpm install

# 2. Build the project
pnpm build

# 3. Start all services
make dev

# 4. Create your first MCP server
pnpm omni create
```

Your gateway will be running at **http://localhost:37373** 🎉

## 🏗️ What is Omni MCP?

Omni is a **production-ready MCP platform** that lets you:

- 🔄 **Gateway Router**: Single entry point that routes requests to multiple MCP servers
- 🛠️ **CLI Toolkit**: Create, manage, and validate MCP servers with `pnpm omni`
- 🐳 **Docker Ready**: Full containerization with hot-reload for development
- 📈 **Auto-Scaling**: HTTP-based microservices architecture
- ✅ **Enterprise Patterns**: Validation, health checks, and best practices built-in

## 🎯 Core Commands

```bash
# Development
make dev              # Start all services with hot reload
make clean            # Clean up Docker containers

# MCP Server Management
pnpm omni create      # Create a new MCP server (interactive)
pnpm omni list        # List all servers
pnpm omni validate    # Check server compliance
pnpm omni remove <name> --force  # Remove a server

# Building
pnpm build            # Build all packages
pnpm build:docker     # Build Docker images
```

## 📂 Project Structure

```
omni/
├── gateway/              # MCP Gateway (routes requests)
├── servers/              # Individual MCP servers
│   └── linear-mcp-server/    # Example: Linear integration
├── packages/
│   └── dev-tools/        # CLI toolkit (pnpm omni)
├── shared/               # Shared utilities and types
├── deployment/           # Docker Compose configs
└── docs/                 # Detailed documentation
```

## 🔌 Architecture

- **Gateway** (port 37373): Routes MCP requests to appropriate servers
- **MCP Servers** (ports 3001+): Individual HTTP microservices
- **Smart Routing**: Automatic service discovery and health checking
- **Hot Reload**: Changes auto-reload in development

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
