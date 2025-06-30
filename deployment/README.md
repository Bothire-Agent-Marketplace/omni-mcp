# Deployment Configurations

This directory contains all deployment-related configurations for the Omni MCP project.

## Docker Compose Files

### Core Infrastructure

- `docker-compose.yml` - Base services (PostgreSQL, shared networks, volumes)
- `docker-compose.dev.yml` - Development-specific services and overrides
- `docker-compose.prod.yml` - Production-specific services and overrides (TODO)

### Usage

**Development Environment:**

```bash
# Start all services for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Stop all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

**Production Environment:**

```bash
# TODO: Create production compose file
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## MCP Client Configuration

The `compose/mcp-compose.yaml` file is specifically for MCP client configuration and uses a different schema than Docker Compose. It defines how MCP servers are launched by Claude Desktop.

## Directory Structure

```
deployment/
├── docker-compose.yml          # Base infrastructure services
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production overrides (TODO)
├── fly/                        # Fly.io deployment configs
├── kubernetes/                 # Kubernetes deployment configs
└── README.md                   # This file
```
