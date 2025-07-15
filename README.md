# 🚀 Omni: Enterprise MCP Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

Omni is a **scalable, enterprise-grade platform** for hosting and managing multiple **MCP (Model
Context Protocol) servers**. It features a central gateway for routing, a standardized microservice
pattern, and a comprehensive suite of developer tools to streamline development and ensure
consistency.

## ✨ Key Features

- 🏗️ **Modular Architecture**: Clean separation of concerns with dedicated MCP servers
- 🌐 **Central Gateway**: Intelligent routing and load balancing across services
- 🏢 **Multi-Tenant Database**: Organization-based access control with PostgreSQL
- 🔐 **Clerk Integration**: Seamless authentication with webhook synchronization
- 🔧 **Developer Tools**: Comprehensive CLI tools for testing and debugging
- 📊 **Enterprise Ready**: Production-grade logging, monitoring, and error handling
- 🔄 **Hot Reloading**: Fast development workflow with automatic restarts
- 🧪 **Quality Assurance**: Automated testing, linting, and dead code detection
- 📦 **Monorepo Structure**: Organized with pnpm workspaces and Turborepo
- 🔒 **Type Safety**: Full TypeScript coverage with strict validation

## 🚀 Getting Started

This project is a `pnpm` workspace monorepo, managed with `turborepo`.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v9 or higher)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd omni
    ```

2.  **Install dependencies:** This command installs dependencies for all packages and apps in the
    monorepo.

    ```bash
    pnpm install
    ```

3.  **Set up the database:** Follow the database setup guide for the multi-tenant system.

    ```bash
    cd apps/mcp-admin
    cp .env.example .env.local
    # Edit .env.local with your database and Clerk configuration
    pnpm db:migrate
    pnpm db:seed
    ```

4.  **Start development:** The main dev command automatically starts all services with webhook sync.

    ```bash
    # Start all services + webhook endpoint (recommended)
    pnpm dev

    # Alternative: Start without webhook endpoint
    pnpm dev:no-webhook
    ```

For detailed development workflow, see
[`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md).

## 🛠️ Core Commands

These commands should be run from the root of the project.

| Command               | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `pnpm dev`            | Start all services + webhook endpoint with hot-reloading.           |
| `pnpm dev:no-webhook` | Start all services without webhook endpoint.                        |
| `pnpm build`          | Build all packages and applications for production.                 |
| `pnpm test`           | Run all tests using Vitest.                                         |
| `pnpm lint`           | Automatically fix linting issues and format all code.               |
| `pnpm audit`          | Find unused dependencies and dead code (unused exports).            |
| `pnpm clean`          | Remove all build artifacts (`dist` folders) and `node_modules`.     |
| `pnpm sync`           | Ensure `package.json` files are consistent and formatted correctly. |

### Multi-Tenant Development

| Command                              | Description                                          |
| ------------------------------------ | ---------------------------------------------------- |
| `pnpm dev:with-ngrok`                | Start only admin app with ngrok for webhook testing. |
| `pnpm --filter mcp-admin db:migrate` | Run database migrations.                             |
| `pnpm --filter mcp-admin db:seed`    | Seed database with default MCP servers.              |
| `pnpm --filter mcp-admin db:studio`  | Open Prisma Studio for database management.          |

> **Note:** The main `pnpm dev` command automatically starts the webhook endpoint at
> `https://bothire.ngrok.app/api/webhooks/clerk` to ensure Clerk stays in sync with the database
> during development.

## ✨ Developer Experience

This repository is built with the developer experience in mind and includes several features to
improve productivity and code quality.

### Pre-commit Hooks

On every commit, a `pre-commit` hook will automatically run `lint-staged`. This ensures that only
code that passes our linting and formatting rules is committed to the repository.

### Consistent Tooling

The project is configured to use a consistent set of tools for testing, linting, and formatting:

- **Testing**: [Vitest](https://vitest.dev/)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)
- **Package Management**: [pnpm](https://pnpm.io/)
- **Monorepo Orchestration**: [Turborepo](https://turbo.build/)

# MCP Servers

A collection of Model Context Protocol (MCP) servers for various integrations.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## 🧹 Code Quality & Maintenance

### Dead Code Detection with Knip

We use [Knip](https://knip.dev) to automatically detect and clean up dead code, unused dependencies,
and unused exports. **Knip is now integrated into our pre-commit hooks** to catch issues early:

```bash
# Scan for dead code and unused dependencies
pnpm run audit

# Automatically fix/remove dead code and dependencies
pnpm run audit:fix

# CI-friendly check (JSON output, fails on issues)
pnpm run audit:ci
```

**What Knip finds:**

- ✅ Unused files, exports, and imports
- ✅ Unused dependencies and devDependencies
- ✅ Unreferenced types and interfaces
- ✅ Duplicate exports
- ✅ Missing dependencies

**Pre-commit Integration:**

- 🔍 **Pre-commit**: Knip runs automatically before each commit
- 🚫 **Blocks commits**: If unused imports/exports are found
- 🔧 **Auto-fix**: Run `pnpm run audit:fix` to resolve issues
- 📦 **Pre-push**: Comprehensive audit before pushing changes

### Other Quality Tools

```bash
# Lint and format code
pnpm lint

# Sync package versions across workspace
pnpm sync

# Clean build artifacts and node_modules
pnpm clean
```

## Architecture

### Gateway

The central MCP gateway that routes requests to appropriate servers based on capability mapping and
organization-based access control.

### Multi-Tenant Admin System

- **Database**: PostgreSQL with organization-based isolation
- **Authentication**: Clerk integration with webhook synchronization
- **Access Control**: Organization-level service enablement
- **Audit Trail**: Complete change history tracking

### MCP Servers

- **Devtools Server**: Browser automation and testing tools
- **Linear Server**: Integration with Linear for issue tracking
- **Perplexity Server**: AI-powered search and research

### Packages

- **@mcp/capabilities**: Central registry of server capabilities
- **@mcp/schemas**: Shared TypeScript types and schemas
- **@mcp/utils**: Common utilities, logging, and validation

## Development

Each MCP server follows a consistent pattern:

1. **Configuration**: Service-specific config with validation
2. **Handlers**: Business logic with Zod runtime validation
3. **HTTP Server**: Fastify-based server with error handling
4. **Dependency Injection**: Clean architecture with injected dependencies

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork and clone** the repository
2. **Install dependencies**: `pnpm install`
3. **Create feature branch**: `git checkout -b feat/your-feature`
4. **Make changes** following our patterns
5. **Run quality checks**: `pnpm lint && pnpm test && pnpm audit`
6. **Submit pull request** with clear description

### Development Standards

- ✅ Run `pnpm audit` before committing to ensure no dead code
- ✅ Follow existing patterns for new MCP servers
- ✅ Add comprehensive Zod validation for all inputs
- ✅ Use shared utilities from `@mcp/utils`
- ✅ Maintain TypeScript strict mode (no `any` types)

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## 🔒 Security

For security concerns, please review our [Security Policy](SECURITY.md) and report vulnerabilities
privately.

## 📞 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/omni/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/omni/discussions)

## 🏷️ Available MCP Servers
