# Omni MCP - Enterprise MCP Server Platform

A modern, scalable Model Context Protocol (MCP) platform with unified gateway, containerized servers, and enterprise-grade development workflows.

## 🏗️ Architecture

```
Claude Desktop/AI Client → MCP Gateway (HTTP) → Individual MCP Servers → External APIs
                                ↓
                        PostgreSQL + Redis + Infrastructure
```

**Core Components:**

- **MCP Gateway**: Central hub routing requests to specific MCP servers
- **Linear MCP Server**: Issue management and project tracking
- **Infrastructure**: PostgreSQL database, Redis cache, monitoring tools

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone and setup environment
git clone <your-repo>
cd omni
make setup

# Configure your API keys
cp .env.development .env.development.local
# Edit .env.development.local with your Linear API key
```

### 2. Start Development Environment

```bash
# Start everything with hot reload
make dev

# Or start in background
make dev-detached
```

### 3. Verify Services

```bash
# Check all services are healthy
make health

# View logs
make logs
```

**Development URLs:**

- MCP Gateway: http://localhost:37373
- pgAdmin: http://localhost:8080 (admin@omni.dev / admin)
- Mailhog: http://localhost:8025

## 🔧 Environment Management

### Development

```bash
# Setup development environment
make setup                        # Creates .env.development.local
# Edit .env.development.local with your API keys
make dev                         # Start development with hot reload
```

### Production

```bash
# Setup production environment
cp .env.production .env.production.local
# Edit .env.production.local with production secrets
make prod                        # Start production environment
```

### Environment Files

- `.env.development` → Template (committed)
- `.env.development.local` → Your actual dev config (gitignored)
- `.env.production.local` → Your actual prod config (gitignored)

## 📱 Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

Replace `YOUR_MCP_API_KEY` with the value from your `.env.development.local`.

## 🛠️ Development Commands

### Core Operations

```bash
make help                        # Show all available commands
make setup                       # Initial project setup
make dev                         # Start development environment
make prod                        # Start production environment
make restart                     # Quick restart development
```

### Monitoring & Debugging

```bash
make logs                        # View all service logs
make logs-gateway                # Gateway logs only
make logs-linear                 # Linear server logs only
make status                      # Service status
make health                      # Detailed health check
```

### Development Tools

```bash
make shell-gateway               # Access gateway container
make shell-linear                # Access linear server container
make db-shell                    # PostgreSQL shell
make db-reset                    # Reset development database
```

### Testing & Quality

```bash
make test                        # Run all tests
make lint                        # Code linting
make build                       # Build all images
make clean                       # Clean up containers
```

## 🐳 Docker & Networking

### Service Architecture

- **Network**: `omni-mcp-network` (bridge)
- **Volumes**: `omni-postgres-data`, `omni-mcp-files`, `omni-mcp-uploads`
- **Containers**: All prefixed with `omni-` for easy identification

### Container Structure

```bash
omni-mcp-gateway          # :37373 (HTTP gateway)
omni-linear-mcp-server    # Internal MCP server
omni-postgres             # :5432 (database)
omni-pgadmin-dev          # :8080 (dev only)
omni-mailhog-dev          # :8025 (dev only)
omni-redis-dev            # :6379 (dev only)
```

### Hot Reload Development

- Source code mounted as volumes for instant changes
- Debug ports exposed: Gateway (9229), Linear (9230)
- Automatic rebuilds with `make dev`

## 📦 Adding New MCP Servers

### 1. Create Server Structure

```bash
mkdir -p servers/your-mcp-server/src/mcp-server
cp servers/linear-mcp-server/Dockerfile servers/your-mcp-server/
cp servers/linear-mcp-server/package.json servers/your-mcp-server/
# Edit package.json with your server details
```

### 2. Add to Docker Compose

Add your service to `docker-compose.yml`:

```yaml
your-mcp-server:
  build:
    context: .
    dockerfile: servers/your-mcp-server/Dockerfile
  environment:
    - YOUR_API_KEY=${YOUR_API_KEY}
  networks:
    - mcp-network
```

### 3. Update Environment

Add your API keys to `.env.development` and `.env.production`.

### 4. Register with Gateway

Update your MCP Gateway configuration to route to the new server.

## 🔐 Security & Production

### Secrets Management

```bash
# Generate secure secrets for production
make generate-secrets

# Update .env.production.local with generated values
JWT_SECRET=<generated-jwt-secret>
MCP_API_KEY=<generated-api-key>
POSTGRES_PASSWORD=<generated-db-password>
```

### Production Deployment

```bash
# Start production with monitoring
docker-compose --profile monitoring up -d

# Check production health
make health
```

## 🚨 Troubleshooting

### Common Issues

```bash
# Services won't start
make clean && make dev

# Database connection issues
make db-reset

# Gateway not accessible
make logs-gateway

# Hot reload not working
make restart
```

### Health Checks

```bash
# Quick health check
make health

# Detailed container inspection
docker ps --filter "name=omni-"

# Check specific service logs
make logs-<service-name>
```

## 📁 Project Structure

```
omni/
├── docker-compose.yml           # Production services
├── docker-compose.dev.yml       # Development overrides
├── Makefile                     # Developer commands
├── .env.development             # Dev environment template
├── .env.production              # Prod environment template
├── gateway/                     # MCP Gateway service
│   ├── Dockerfile
│   └── src/
├── servers/                     # Individual MCP servers
│   └── linear-mcp-server/
│       ├── Dockerfile
│       └── src/
├── shared/schemas/              # Shared TypeScript types
├── client-integrations/         # Claude Desktop configs
└── data/                        # Persistent data
    ├── files/
    └── uploads/
```

## 🎯 Next Steps

1. **Add More MCP Servers**: GitHub, Slack, Notion, etc.
2. **Scale Infrastructure**: Add load balancing, monitoring
3. **CI/CD Integration**: Deploy with GitHub Actions
4. **Custom Tools**: Build domain-specific MCP servers

---

**Need Help?** Run `make help` for all available commands or check the logs with `make logs`.
