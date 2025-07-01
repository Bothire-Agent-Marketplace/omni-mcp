# Deployment Configurations

This directory contains all deployment-related configurations for the Omni MCP project.

## Docker Compose Files

### Core Infrastructure

- `docker-compose.yml` - Base services (PostgreSQL, shared networks, volumes)
- `docker-compose.dev.yml` - Development-specific services and overrides

### Usage

**Development Environment:**

```bash
# Use the Makefile for proper environment loading
make dev                        # Recommended approach
make dev-detached              # Background mode

# Or manually with proper environment files
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file secrets/.env.development.local up -d
```

**Production Environment:**

```bash
# Use the Makefile for proper environment loading
make prod                      # Recommended approach

# Or manually with proper environment files
docker compose -f docker-compose.yml --env-file .env.production.local up -d
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

## MCP Client Configuration

The `client-integrations/claude-desktop/` directory contains Claude Desktop configurations that are automatically generated and synced.

## Directory Structure

```
deployment/
├── docker-compose.yml          # Base infrastructure services
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
