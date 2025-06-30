# Omni MCP - Enterprise MCP Server Platform

A modern, enterprise-grade **Model Context Protocol (MCP) platform** with **powerful CLI tools**, unified gateway, and scalable server management. Create, validate, and manage 100+ MCP servers with consistent patterns and zero technical debt.

## 🚀 Quick Start

### 1. Get Started in 30 Seconds

```bash
# Clone and setup
git clone <your-repo>
cd omni
make setup

# Start development environment
make dev

# Create your first MCP server
make create-mcp SERVICE=github
```

### 2. Verify Everything Works

```bash
# Check all services
make health

# List your MCP servers
make list-mcp-verbose

# Validate enterprise compliance
make validate-mcp
```

**🎉 You now have a fully functional enterprise MCP platform!**

## 🛠️ CLI & Makefile Commands

The Omni platform is designed around **simple, powerful commands** that handle all complexity behind the scenes.

### 🏗️ MCP Server Management

```bash
# CREATE new MCP servers with full scaffolding
make create-mcp SERVICE=github     # GitHub integration
make create-mcp SERVICE=slack      # Slack integration
make create-mcp SERVICE=jira       # Jira integration
make create-mcp SERVICE=notion     # Notion integration

# LIST and inspect servers
make list-mcp                      # Quick list
make list-mcp-verbose              # Detailed info with compliance

# VALIDATE enterprise pattern compliance
make validate-mcp                  # All servers (0-100% scoring)
make validate-mcp SERVICE=github   # Specific server

# REMOVE servers safely
make remove-mcp SERVICE=oldserver  # Clean deletion + dependency cleanup
```

### 🚀 Development Environment

```bash
# ENVIRONMENT management
make setup                         # Initial project setup
make dev                          # Start development (hot reload)
make dev-detached                 # Background development
make restart                      # Quick restart

# MONITORING & debugging
make logs                         # Real-time logs (all services)
make logs-mcp-only               # Just MCP servers
make status                      # Service status overview
make health                      # Detailed health check

# QUALITY & testing
make test                        # Run all tests
make validate-mcp-pattern        # Validate enterprise patterns
make build                       # Build all Docker images
make clean                       # Clean up containers
```

### 📱 Claude Desktop Integration

```bash
# CLAUDE DESKTOP setup
make claude-config-dev           # Use local servers
make claude-config-prod          # Use Docker containers
make claude-watch                # Auto-sync config changes
```

### 🔧 Advanced CLI Access

```bash
# Direct CLI access with custom options
make omni-cli ARGS="create slack --template advanced"
make omni-cli ARGS="validate --fix"
make omni-cli ARGS="list --verbose"

# Database operations
make db-shell                    # PostgreSQL access
make db-reset                    # Reset development database

# Security
make generate-secrets            # Generate production secrets
```

## 🏆 Enterprise MCP Server Pattern

Every MCP server created follows the **Enterprise MCP Server Pattern** automatically:

### ✅ What Gets Generated

```bash
make create-mcp SERVICE=github
```

**Creates:**

```
servers/github-mcp-server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── config/config.ts            # Environment configuration
│   └── mcp-server/
│       ├── server.ts               # MCP server setup
│       ├── tools.ts                # Shared type imports
│       ├── resources.ts            # Shared type imports
│       ├── prompts.ts              # Shared type imports
│       └── tools/github-tools.ts   # Implementation with placeholders
├── package.json                    # Full dependencies
├── tsconfig.json                   # TypeScript config
├── Dockerfile                      # Multi-stage build
└── README.md                       # Complete documentation

shared/schemas/src/github/
├── mcp-types.ts                    # MCP definitions (tools/resources/prompts)
└── github.ts                       # Simple placeholder domain types
```

### 🎯 Perfect Starting Template

**Domain Types** (`github.ts`):

```typescript
// Simple placeholder types for customization
export const CreateGithubSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export const GithubResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
});
```

**Tool Implementation** (`github-tools.ts`):

```typescript
// Enterprise pattern with placeholder logic
async github_create(args: CreateGithubInput): Promise<McpResponse<GithubResult>> {
  return this._execute("github_create", async () => {
    // TODO: Replace with actual GitHub API calls
    const { title, description } = args;

    const result: GithubResult = {
      id: "placeholder-id",
      title,
      url: `https://api.github.com/entities/placeholder-id`
    };

    return result;
  });
}
```

### 🔍 Enterprise Pattern Validation

```bash
make validate-mcp SERVICE=github
```

**Validation Checks:**

- ✅ **Shared Type System**: Imports from `@mcp/schemas`
- ✅ **Error Handling**: `_execute()` wrapper pattern
- ✅ **Response Types**: `McpResponse<T>` usage
- ✅ **Directory Structure**: Required files present
- ✅ **Docker Ready**: Multi-stage builds
- ✅ **Documentation**: Complete README

**Scoring**: 🟢 90%+ = Excellent, 🟡 70-89% = Good, 🔴 <70% = Needs improvement

## 🏗️ Architecture Overview

```
Claude Desktop/AI Client → MCP Gateway (HTTP) → Individual MCP Servers → External APIs
                                ↓
                        PostgreSQL + Redis + Infrastructure
```

**Core Philosophy:**

- **CLI-First**: All operations via simple commands
- **Enterprise-Ready**: Consistent patterns, type safety, validation
- **Scalable**: Ready for 100+ MCP servers
- **Developer-Friendly**: Hot reload, auto-validation, clear feedback

## 📋 Development Workflow

### Typical MCP Server Creation

```bash
# 1. Create server with scaffolding
make create-mcp SERVICE=notion

# 2. Configure API credentials
cd servers/notion-mcp-server
# Edit src/config/config.ts with Notion API key

# 3. Customize types for your use case
# Edit shared/schemas/src/notion/notion.ts

# 4. Implement actual API calls
# Edit src/mcp-server/tools/notion-tools.ts

# 5. Build and validate
pnpm build
make validate-mcp SERVICE=notion

# 6. Test with Claude Desktop
make claude-config-dev
make claude-watch
```

### Multi-Server Management

```bash
# Create multiple services
make create-mcp SERVICE=github
make create-mcp SERVICE=linear
make create-mcp SERVICE=slack

# Validate all at once
make validate-mcp

# Monitor everything
make logs-mcp-only
```

## 🐳 Infrastructure & Services

### Service URLs (Development)

- **MCP Gateway**: http://localhost:37373
- **pgAdmin**: http://localhost:8080 (admin@omni.dev / admin)
- **Mailhog**: http://localhost:8025
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Container Architecture

```bash
omni-mcp-gateway          # :37373 (HTTP gateway)
omni-linear-mcp-server    # Internal MCP server
omni-postgres             # :5432 (database)
omni-pgadmin-dev          # :8080 (dev only)
omni-mailhog-dev          # :8025 (dev only)
omni-redis-dev            # :6379 (dev only)
```

### Environment Management

```bash
# Development
make setup                        # Creates .env.development.local
# Edit .env.development.local with your API keys
make dev                         # Start with hot reload

# Production
cp .env.production .env.production.local
# Edit .env.production.local with production secrets
make prod                        # Start production environment
```

## 📱 Claude Desktop Integration

### Automatic Configuration

```bash
# Choose your integration approach:
make claude-config-dev           # Direct to local servers (fastest)
make claude-config-prod          # Through Docker containers
make claude-config-gateway       # Through MCP gateway (enterprise)

# Start auto-sync
make claude-watch                # Watches for config changes
```

### Manual Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omni-gateway": {
      "command": "curl",
      "args": [
        "-X",
        "POST",
        "http://localhost:37373/mcp",
        "-H",
        "Content-Type: application/json",
        "-H",
        "Authorization: Bearer YOUR_MCP_API_KEY",
        "--data-binary",
        "@-"
      ]
    }
  }
}
```

## 🚨 Troubleshooting

### Quick Fixes

```bash
# Services won't start
make clean && make dev

# MCP servers not working
make validate-mcp              # Check compliance issues
make logs-mcp-only            # Check server logs

# Database issues
make db-reset                 # Reset development database

# Claude Desktop not connecting
make claude-watch             # Ensure config is synced
make health                   # Check all services

# General issues
make restart                  # Quick restart everything
make status                   # Check service status
```

### Common Issues

| Problem               | Solution                                                              |
| --------------------- | --------------------------------------------------------------------- |
| CLI command not found | `cd packages/dev-tools && pnpm build`                                 |
| Validation errors     | Check shared type imports in `tools.ts`, `resources.ts`, `prompts.ts` |
| Type errors           | Rebuild schemas: `cd shared/schemas && pnpm build`                    |
| Docker issues         | `make clean && make build`                                            |
| Port conflicts        | Check existing services on ports 37373, 5432, 6379                    |

## 📁 Project Structure

```
omni/
├── Makefile                     # 🎯 Main developer interface
├── CLI_GUIDE.md                 # 📖 Complete CLI documentation
├── docker-compose.yml           # Production services
├── docker-compose.dev.yml       # Development overrides
├── packages/dev-tools/          # 🛠️ CLI implementation
│   └── src/cli/                 # Command implementations
├── servers/                     # 🚀 Individual MCP servers
│   └── linear-mcp-server/       # Example: Linear integration
├── shared/schemas/              # 📋 Shared TypeScript types
│   └── src/
│       ├── mcp/types.ts         # Core MCP types
│       ├── linear/              # Linear-specific types
│       └── [service]/           # Generated service types
├── gateway/                     # 🌐 MCP Gateway service
├── client-integrations/         # 📱 Claude Desktop configs
└── data/                        # 💾 Persistent data
```

## 🎯 Advanced Features

### Template System (Coming Soon)

```bash
make omni-cli ARGS="create github --template enterprise"
make omni-cli ARGS="create slack --template minimal"
```

### Batch Operations

```bash
# Validate all servers with auto-fix
make omni-cli ARGS="validate --fix --all"

# Bulk updates
make omni-cli ARGS="update-schema --all"
```

### Production Deployment

```bash
# Generate secure secrets
make generate-secrets

# Deploy with monitoring
docker-compose --profile monitoring up -d

# Health checks
make health
```

## 🔗 Documentation

- **[CLI_GUIDE.md](CLI_GUIDE.md)** - Complete CLI usage guide
- **[MCP_SERVER_PATTERN.md](MCP_SERVER_PATTERN.md)** - Enterprise patterns
- **[deployment/README.md](deployment/README.md)** - Docker & deployment

## 🎉 Getting Help

```bash
make help                        # Show all available commands
make list-mcp-verbose            # See your current servers
make validate-mcp                # Check compliance
make logs                        # View real-time activity
```

---

**🎯 Mission**: Enable teams to rapidly create, validate, and scale 100+ enterprise-grade MCP servers with consistent patterns, type safety, and zero technical debt.

**🚀 Get Started**: `make setup && make create-mcp SERVICE=yourservice`
