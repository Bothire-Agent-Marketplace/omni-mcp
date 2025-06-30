# Architecture

This document provides a high-level overview of the Omni MCP project architecture, its components, and the development workflow. This architecture is designed for scalability and maintainability, following the best practices for large-scale MCP deployments.

## Guiding Principles

- **Hub-and-Spoke Model**: A central **MCP Gateway** acts as a single entry point and reverse proxy for all backend MCP servers. This simplifies client configuration and enables centralized management.
- **Scalable Monorepo**: All custom code (servers, packages, shared libraries) is managed in a `pnpm` monorepo with `Turborepo` for fast, consistent builds.
- **Containerized Microservices**: Every component (gateway, servers, database) is a containerized microservice, orchestrated with Docker Compose for local development.
- **Unified Build System**: A single command (`pnpm build:all`) builds all TypeScript packages and Docker images, and pulls external images.

## System Diagram

```mermaid
graph TD
    subgraph "Client"
        A[Claude Desktop Client]
    end

    subgraph "Docker Network (mcp-net)"
        B[MCP Gateway<br/>(localhost:37373)]
        C[Custom Linear Server<br/>(mcp-linear-dev:8080)]
        D[External Filesystem Server<br/>(mcp-filesystem-dev:8080)]
        E[PostgreSQL Database<br/>(mcp-postgres:5432)]
    end

    subgraph "Monorepo (omni/)"
        F(gateway/)
        G(servers/linear-mcp-server)
        H(packages/dev-tools)
        I(shared/schemas)
    end

    A -- Connects to --> B
    B -- Routes to --> C
    B -- Routes to --> D

    F -- Built into --> B
    G -- Built into --> C

    C -- Connects to --> E

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#b2dfdb,stroke:#00796b,stroke-width:2px
```

## Directory Structure

| Path                         | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `gateway/`                   | Contains the **MCP Gateway** service, the central proxy and router.       |
| `gateway/master.config.json` | The **master configuration file** that defines all backend MCP servers.   |
| `servers/`                   | A pnpm workspace for all custom MCP servers (e.g., `@mcp/linear-server`). |
| `packages/`                  | A pnpm workspace for utility packages (e.g., `dev-tools`).                |
| `shared/`                    | A pnpm workspace for shared code (e.g., `@mcp/schemas`).                  |
| `deployment/`                | Docker Compose files for running the entire infrastructure.               |
| `data/`                      | Data used by services, including the BookSQL database schema.             |
| `package.json`               | The root `package.json` for the entire monorepo.                          |
| `pnpm-workspace.yaml`        | Defines the workspaces for the monorepo.                                  |
| `turbo.json`                 | Turborepo pipeline configuration.                                         |

## Development Workflow

### 1. Build Everything

A single command prepares the entire environment by building all packages and Docker images.

```bash
pnpm build:all
```

### 2. Run the Environment

Start all services (gateway, servers, database) with Docker Compose.

```bash
docker compose -f deployment/docker-compose.yml -f deployment/docker-compose.dev.yml up -d
```

You can now access all services through the gateway at `http://localhost:37373`.

### 3. Connect Your Client

Update your client configuration (e.g., `claude_desktop_config.local.json`) to connect to the gateway. The gateway will expose all backend servers under a namespaced path:

- Linear Server: `http://localhost:37373/mcp/linear`
- Filesystem Server: `http://localhost:37373/mcp/filesystem`

### 4. Develop

Use the monorepo scripts for development:

- **Run dev mode**: `pnpm dev` (for live-reloading of servers)
- **Run file watcher**: `pnpm watch:config`

### Adding a New Server

1.  Add the new server's code to the `servers/` directory.
2.  Add a `Dockerfile` for the new server.
3.  Add an entry for the new server in `gateway/master.config.json`.
4.  Add the new server to the `docker-compose.dev.yml` file.
5.  Run `pnpm build:all` to build the new server and update the gateway.

## BookSQL Database

The project uses the [BookSQL dataset](https://github.com/Exploration-Lab/BookSQL/tree/main/DATA), a comprehensive accounting domain database with 7 interconnected tables:

- **`master_txn_table`** - All business transactions (invoices, payments, expenses)
- **`customers`** - Customer information and balances
- **`vendors`** - Vendor information and outstanding balances
- **`employees`** - Employee data and billing rates
- **`products`** - Products and services offered
- **`chart_of_accounts`** - Chart of accounts (assets, liabilities, income, expenses)
- **`payment_method`** - Available payment methods

This provides rich, realistic data for complex business queries including:

- Revenue analysis by product/service
- Customer balance tracking
- Vendor payment management
- Cash flow analysis
- Overdue invoice reporting
- Account summaries

## Deployment Configurations

### Docker Compose (Infrastructure)

- **Base**: `deployment/docker-compose.yml` - Core services
- **Development**: `deployment/docker-compose.dev.yml` - Dev overrides
- **Production**: `deployment/docker-compose.prod.yml` - Prod overrides (TODO)

### MCP Protocol

- **Client Config**: `compose/mcp-compose.yaml` - How Claude Desktop launches servers

### Cloud Deployments

- **Fly.io**: `deployment/fly/` - Fly.io deployment configurations
- **Kubernetes**: `deployment/kubernetes/` - K8s deployment manifests

## Build Pipeline

The unified build system follows this pipeline:

1. **TypeScript Compilation** (via Turborepo)
   - Builds all packages in `packages/` and `servers/`
   - Uses intelligent caching for fast rebuilds
2. **External Image Management**
   - Pulls latest versions of external Docker images
   - Handles authentication for private registries
3. **Custom Docker Builds**
   - Builds Docker images for custom MCP servers
   - Uses monorepo context for efficient builds

This ensures that a single `pnpm build:all` command prepares your entire development environment.
