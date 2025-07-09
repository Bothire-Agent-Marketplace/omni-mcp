## Best Practice Dependency Flow for a pnpm TypeScript Monorepo

A scalable pnpm monorepo with TypeScript, multiple apps, a front end, several servers, and shared
packages should follow a clear, layered dependency flow. This ensures maintainability, type safety,
and efficient builds.

### 1. Recommended Directory Structure

```
monorepo-root/
  apps/
    gateway/
    devtools-mcp-server/
    linear-mcp-server/
    perplexity-mcp-server/
    ...
  packages/
    shared-types/
    utils/
    capabilities/
    schemas/
    ...
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

- **apps/**: Deployable applications (MCP gateway, MCP servers, etc.).
- **packages/**: Reusable libraries, shared types, utilities, MCP capabilities, schemas, etc.

### 2. Dependency Flow Diagram

**Flow Principle:**  
Dependencies should always point "down" the stack, never "up" or "sideways" (to avoid cycles).

| Layer        | Can depend on...        | Should NOT depend on...     |
| ------------ | ----------------------- | --------------------------- |
| Apps         | Packages                | Other apps                  |
| Packages     | Lower-level packages    | Apps, higher-level packages |
| Shared Types | (none, or utility pkgs) | Apps, feature packages      |

**Example:**

- `apps/gateway` can depend on `packages/schemas`, `packages/utils`, `packages/capabilities`.
- `apps/linear-mcp-server` can depend on `packages/server-core`, `packages/schemas`,
  `packages/utils`.
- `packages/capabilities` can depend on `packages/schemas`, `packages/utils`.
- `packages/schemas` should not depend on any app or feature package.

### 3. Dependency Declaration

- **Internal dependencies:**  
  Use the workspace protocol in `package.json`:
  ```json
  "dependencies": {
    "@yourorg/shared-types": "workspace:*",
    "@yourorg/ui": "workspace:*"
  }
  ```
- **External dependencies:**  
  Add only where needed. Avoid unnecessary bloat in shared packages.

### 4. TypeScript Configuration

- **Root `tsconfig.base.json`:**  
  Contains shared compiler options and path aliases.
- **Each package/app:**  
  Has its own `tsconfig.json` extending the root config and, if needed, referencing dependencies for
  project references and incremental builds.

### 5. Dependency Flow Table

| Consumer                 | Allowed Dependencies               | Example Import                                       |
| ------------------------ | ---------------------------------- | ---------------------------------------------------- |
| `apps/gateway`           | `schemas`, `utils`, `capabilities` | `import { GatewayConfig } from '@mcp/schemas'`       |
| `apps/linear-mcp-server` | `server-core`, `schemas`, `utils`  | `import { createServer } from '@mcp/server-core'`    |
| `capabilities`           | `schemas`, `utils`                 | `import { MCPServerDefinition } from '@mcp/schemas'` |
| `server-core`            | `schemas`, `utils`                 | `import { createMcpLogger } from '@mcp/utils'`       |
| `schemas`                | (none, or utility-only)            | (no imports from other packages)                     |

### 6. Best Practices

- **Single Version Policy:**  
  Keep shared dependencies (e.g., React, TypeScript) at the root to avoid version drift and
  conflicts.
- **Explicit Dependencies:**  
  Every package must declare its dependencies in its own `package.json`—no implicit or "phantom"
  dependencies.
- **No Circular Dependencies:**  
  Design the dependency graph as a Directed Acyclic Graph (DAG) to prevent cycles and build issues.
- **Use Project References:**  
  Enable TypeScript project references for fast, incremental builds and type safety.
- **Centralize Shared Types:**  
  Use a dedicated package (e.g., `shared-types`) for all cross-cutting type definitions.
- **Keep Packages Small and Focused:**  
  Each package should have a single responsibility and minimal dependencies.

### 7. Example Dependency Flow

```
apps/gateway
  ├── packages/schemas
  ├── packages/utils
  └── packages/capabilities
        └── packages/schemas

apps/linear-mcp-server
  ├── packages/server-core
  │     ├── packages/schemas
  │     └── packages/utils
  ├── packages/schemas
  └── packages/utils
```

### 8. Anti-Patterns to Avoid

- **Apps importing from other apps**
- **Packages depending on apps**
- **Circular dependencies between packages**
- **Implicit dependencies (using a package without declaring it in `package.json`)**

### 9. Tools for Visualization and Management

- Use `pnpm why ` to trace dependency relationships.
- Use dependency graph visualizers for large monorepos.

**Summary:**  
Structure your monorepo so that apps depend on packages, packages depend only on lower-level
packages, and shared types/utilities sit at the bottom. Always declare dependencies explicitly,
avoid cycles, and centralize shared types for maximum maintainability and scalability.
