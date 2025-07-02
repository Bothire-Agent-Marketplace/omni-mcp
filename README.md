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

| Command            | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `pnpm dev`         | Start all services in development mode with hot-reloading.          |
| `pnpm build`       | Build all packages and applications for production.                 |
| `pnpm test`        | Run all tests using Vitest.                                         |
| `pnpm lint`        | Automatically fix linting issues and format all code.               |
| `pnpm audit`       | Find unused dependencies and dead code (unused exports).            |
| `pnpm clean`       | Remove all build artifacts (`dist` folders) and `node_modules`.     |
| `pnpm sync`        | Ensure `package.json` files are consistent and formatted correctly. |
| `pnpm omni --help` | Display all available commands for the internal CLI tool.           |

## ✨ Developer Experience

This repository is built with the developer experience in mind and includes several features to
improve productivity and code quality.

### `omni` CLI

A powerful internal CLI for managing MCP servers. Use `pnpm omni create` to scaffold a new,
fully-configured MCP server that is automatically integrated into the workspace. See
`packages/dev-tools/src/cli/CLI_GUIDE.md` for more details.

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
