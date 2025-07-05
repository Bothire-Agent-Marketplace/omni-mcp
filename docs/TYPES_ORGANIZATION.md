## Best Practice Structure of a `shared-types`

A robust `shared-types` package in a pnpm monorepo should be organized for clarity, scalability, and
ease of use. Here’s what a well-structured `shared-types` folder might look like, along with best
practices for maintainability and developer experience.

### 1. Directory Layout Example

```
shared-types/
  ├── src/
  │   ├── api/
  │   │   ├── user.ts
  │   │   ├── product.ts
  │   │   └── index.ts
  │   ├── db/
  │   │   ├── models.ts
  │   │   └── index.ts
  │   ├── enums/
  │   │   ├── status.ts
  │   │   └── index.ts
  │   ├── events/
  │   │   ├── user-vents.ts
  │   │   └── index.ts
  │   ├── utils/
  │   │   ├── date-types.ts
  │   │   └── index.ts
  │   └── index.ts
  ├── package.json
  ├── tsconfig.json
  └── README.md
```

### 2. Folder and File Purposes

| Folder/File     | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `api/`          | Types/interfaces for API request/response shapes            |
| `db/`           | Types for database models, schemas, and related utilities   |
| `enums/`        | Shared enums (e.g., status codes, roles)                    |
| `events/`       | Types for event payloads, event names, and event contracts  |
| `utils/`        | Utility types (e.g., date/time, generics, helpers)          |
| `index.ts`      | Barrel file re-exporting all types for easy imports         |
| `package.json`  | Declares the package and dependencies                       |
| `tsconfig.json` | TypeScript config, often extending the monorepo root config |
| `README.md`     | Documentation for usage and contribution guidelines         |

### 3. Example: Type Definitions

**`api/user.ts`**

```ts
export interface UserRequest {
  id: string;
  includeProfile?: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  profile?: UserProfile;
}

export interface UserProfile {
  bio: string;
  avatarUrl: string;
}
```

**`enums/status.ts`**

```ts
export enum Status {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
}
```

**`db/models.ts`**

```ts
export interface DbUser {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**`events/userEvents.ts`**

```ts
export interface UserCreatedEvent {
  type: "USER_CREATED";
  payload: {
    userId: string;
    timestamp: string;
  };
}
```

### 4. Barrel Exports for Simplicity

**`src/index.ts`**

```ts
export * from "./api";
export * from "./db";
export * from "./enums";
export * from "./events";
export * from "./utils";
```

**`src/api/index.ts`**

```ts
export * from "./user";
export * from "./product";
```

### 5. Usage in Other Packages/Apps

In any app or package within the monorepo:

```ts
import { UserRequest, Status } from "@yourorg/shared-types";
```

### 6. Best Practices

- **Keep types granular:** Organize by domain (API, DB, events) for discoverability.
- **Use barrel files:** Simplifies imports and reduces import path complexity.
- **Document types:** Add JSDoc comments for clarity and IDE support.
- **Version control:** Use semantic versioning if publishing outside the monorepo.
- **TypeScript project references:** Enable for faster builds and type safety.
- **Test types:** Use tools like `tsd` to write type tests for critical contracts.

### 7. Advanced: Type Guards and Utility Types

You can include type guards and utility types in `utils/`:

**`utils/typeGuards.ts`**

```ts
import { UserResponse } from "../api/user";

export function isUserResponse(obj: any): obj is UserResponse {
  return typeof obj.id === "string" && typeof obj.name === "string";
}
```

### 8. Example `package.json` and `tsconfig.json`

**`package.json`**

```json
{
  "name": "@yourorg/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b"
  }
}
```

**`tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "composite": true
  },
  "include": ["src"]
}
```
