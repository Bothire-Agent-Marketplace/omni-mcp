## Best Practice Dependency Flow for a pnpm TypeScript Monorepo

A scalable pnpm monorepo with TypeScript, multiple apps, a front end, several servers, and shared
packages should follow a clear, layered dependency flow. This ensures maintainability, type safety,
and efficient builds.

### 1. Recommended Directory Structure

```
monorepo-root/
  apps/
    frontend/
    server-a/
    server-b/
    ...
  packages/
    shared-types/
    ui/
    utils/
    api-client/
    ...
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

- **apps/**: Deployable applications (front end, servers, etc.).
- **packages/**: Reusable libraries, shared types, UI components, utilities, API clients, etc.

### 2. Dependency Flow Diagram

**Flow Principle:**  
Dependencies should always point "down" the stack, never "up" or "sideways" (to avoid cycles).

| Layer        | Can depend on...        | Should NOT depend on...     |
| ------------ | ----------------------- | --------------------------- |
| Apps         | Packages                | Other apps                  |
| Packages     | Lower-level packages    | Apps, higher-level packages |
| Shared Types | (none, or utility pkgs) | Apps, feature packages      |

**Example:**

- `apps/frontend` can depend on `packages/ui`, `packages/api-client`, `packages/shared-types`.
- `apps/server-a` can depend on `packages/api-client`, `packages/shared-types`, `packages/utils`.
- `packages/ui` can depend on `packages/shared-types`, `packages/utils`.
- `packages/shared-types` should not depend on any app or feature package.

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

| Consumer        | Allowed Dependencies                  | Example Import                                  |
| --------------- | ------------------------------------- | ----------------------------------------------- |
| `apps/frontend` | `ui`, `api-client`, `shared-types`    | `import { Button } from '@yourorg/ui'`          |
| `apps/server-a` | `api-client`, `shared-types`, `utils` | `import { getUser } from '@yourorg/api-client'` |
| `ui`            | `shared-types`, `utils`               | `import { User } from '@yourorg/shared-types'`  |
| `api-client`    | `shared-types`, `utils`               | `import { fetcher } from '@yourorg/utils'`      |
| `shared-types`  | (none, or utility-only)               | (no imports from other packages)                |

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
apps/frontend
  ├── packages/ui
  │     └── packages/shared-types
  ├── packages/api-client
  │     └── packages/shared-types
  └── packages/shared-types

apps/server-a
  ├── packages/api-client
  │     └── packages/shared-types
  ├── packages/utils
  └── packages/shared-types
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
