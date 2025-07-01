# Deployment Configurations

This directory contains all deployment-related configurations for the Omni MCP project.

## Overview

All Docker Compose files and deployment configurations have been consolidated into this directory for better organization and maintainability.

## Docker Compose Files

### Core Infrastructure

- `docker-compose.yml` - Production services (Gateway, Linear MCP, PostgreSQL, FileSystem MCP)
- `docker-compose.dev.yml` - Development-specific services and overrides (hot reload, debug ports, dev tools)

### Usage

**Development Environment:**

```bash
# Use the Makefile for proper environment loading (recommended)
make dev                        # Interactive mode
make dev-bg                    # Background mode
make dev-tools                 # Development tools only (pgAdmin, Mailhog, Redis)

# Or manually with proper environment files
cd deployment
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file ../secrets/.env.development.local up -d
```

**Production Environment:**

```bash
# Use the Makefile for proper environment loading (recommended)
make prod                      # Start production environment

# Or manually with proper environment files
cd deployment
docker compose -f docker-compose.yml --env-file ../.env.production.local up -d
```

## Environment Variable Hierarchy

The project uses a hierarchical environment variable system:

1. **`secrets/.env.development.local`** - Your actual secrets (never committed)
2. **`.env.development.local.example`** - Development template
3. **`.env.production.local.example`** - Production template
4. **Service-specific**: `servers/[service]/.env.example` - Service templates

### Setup Commands

```bash
# Development setup
make setup                     # Creates secrets/.env.development.local

# Production setup
make setup-prod               # Creates .env.production.local
```

## Services Overview

### Production Services

- **MCP Gateway** - Central routing hub for all MCP servers
- **Linear MCP Server** - Linear API integration
- **PostgreSQL** - Shared database with BookSQL sample data
- **FileSystem MCP Server** - File operations support

### Development-Only Services

- **pgAdmin** - Database management UI (port 8080)
- **Mailhog** - Email testing (SMTP: 1025, UI: 8025)
- **Redis** - Caching support (port 6379)

## Directory Structure

```
deployment/
├── docker-compose.yml          # Production services
├── docker-compose.dev.yml      # Development overrides
└── README.md                   # This file

Root level:
├── secrets/                    # Centralized secrets (gitignored)
│   └── .env.development.local  # Your actual development secrets
├── .env.development.local.example  # Development template
├── .env.production.local.example   # Production template
└── servers/[service]/
    └── .env.example           # Service-specific templates
```

## Best Practices

1. **Always use the Makefile** - It handles proper environment loading and path management
2. **Keep secrets in `secrets/` directory** - Never commit actual API keys or passwords
3. **Use proper compose file layering** - Base file for production, dev file for overrides
4. **Centralized deployment configs** - All Docker Compose files in this directory
5. **Environment-specific overrides** - Use appropriate env files for each environment
6. **Follow MCP Server Pattern** - Individual MCP servers follow the established enterprise pattern

## Common Commands

```bash
# Start development environment
make dev

# View logs
make logs
make logs-gateway
make logs-linear

# Check health
make health
make status

# Database access
make db-connect
make db-reset

# Cleanup
make clean
make clean-all
```

## MCP Server Development

When creating new MCP servers (like a database MCP server), follow the **Enterprise MCP Server Pattern** documented in `docs/MCP_SERVER_PATTERN.md`. Each server should:

- Use the official MCP SDK pattern
- Follow the standardized directory structure: `servers/[service]-mcp-server/`
- Implement proper tool, resource, and prompt separation
- Use hierarchical environment variable loading
- Be containerized with proper Dockerfile

## MCP Client Configuration

The `client-integrations/claude-desktop/` directory contains Claude Desktop configurations that are automatically generated and synced based on the services defined here.
