# Omni: Enterprise MCP Platform

Omni is a scalable, enterprise-grade platform for hosting and managing multiple MCP (Model Context
Protocol) servers. It features a central gateway for routing, a standardized microservice pattern,
and a suite of developer tools to streamline development and ensure consistency.

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

## 🛠️ Core Commands

These commands should be run from the root of the project.

| Command      | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `pnpm dev`   | Start all services in development mode with hot-reloading.          |
| `pnpm build` | Build all packages and applications for production.                 |
| `pnpm test`  | Run all tests using Vitest.                                         |
| `pnpm lint`  | Automatically fix linting issues and format all code.               |
| `pnpm audit` | Find unused dependencies and dead code (unused exports).            |
| `pnpm clean` | Remove all build artifacts (`dist` folders) and `node_modules`.     |
| `pnpm sync`  | Ensure `package.json` files are consistent and formatted correctly. |

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

The central MCP gateway that routes requests to appropriate servers based on capability mapping.

### MCP Servers

- **Linear Server**: Integration with Linear for issue tracking
- **Query Quill Server**: Database query interface (removed for simplification)

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

## Contributing

1. Run `pnpm run audit` before committing to ensure no dead code
2. Follow existing patterns for new servers
3. Add comprehensive Zod validation for all inputs
4. Use the shared utilities from `@mcp/utils`

### Management

For detailed CLI usage, see the workspace documentation.

### Available Servers
