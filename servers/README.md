# Custom MCP Servers

This directory contains all custom MCP servers, managed as a monorepo using `pnpm` workspaces.

## 🚀 Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/installation)

### Installation

Install all dependencies for all servers from the `servers/` directory:

```bash
pnpm install
```

### Development

To run all servers in development mode (with hot-reloading):

```bash
pnpm dev
```

To run a single server in development mode:

```bash
pnpm --filter <server-name> dev
```

Example: `pnpm --filter linear-mcp-server dev`

## ✨ Adding a New Server

1.  **Create a new directory** for your server inside `servers/`.

    ```bash
    mkdir servers/my-new-server
    cd servers/my-new-server
    ```

2.  **Create a `package.json`** file. You can use `pnpm init`.

3.  **Add `build` and `dev` scripts** to your `package.json`. Use `tsx` for development and `tsc` for builds.

    ```json
    "scripts": {
      "build": "tsc",
      "dev": "tsx src/index.ts",
      "watch": "tsx watch src/index.ts",
      "clean": "rm -rf dist",
      "type-check": "tsc --noEmit"
    }
    ```

4.  **Create a `tsconfig.json`** that extends the base configuration:

    ```json
    {
      "extends": "../tsconfig.base.json",
      "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist"]
    }
    ```

5.  **Add the new server's directory name** to `servers/pnpm-workspace.yaml`.

6.  **Add a service definition** to `compose/mcp-compose.yaml`.

7.  **Run `pnpm install`** from the `servers/` directory to link the new package.
