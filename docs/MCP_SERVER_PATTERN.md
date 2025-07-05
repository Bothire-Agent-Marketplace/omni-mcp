# MCP Server Pattern Documentation

## Overview

This document describes the standardized pattern for creating MCP servers in this monorepo.

## File Structure Template

When creating a new MCP server, follow this structure:

```
apps/[domain]-mcp-server/
├── src/
│   ├── config/
│   │   └── config.ts              # Server configuration
│   ├── types/
│   │   └── domain-types.ts        # Domain-specific TypeScript types
│   ├── schemas/
│   │   └── domain-schemas.ts      # Domain-specific Zod validation schemas
│   ├── mcp-server/
│   │   ├── handlers.ts            # Business logic handlers
│   │   ├── http-server.ts         # HTTP server setup
│   │   ├── tools.ts               # Tool definitions and exports
│   │   ├── resources.ts           # Resource definitions and exports
│   │   └── prompts.ts             # Prompt functions
│   │
│   └── index.ts                   # Main entry point
├── package.json
└── tsconfig.json
```

## File Naming Convention

### 1. Domain-Specific Files

- **`domain-types.ts`**: TypeScript interfaces specific to your domain
- **`domain-schemas.ts`**: Zod validation schemas for runtime validation

### 2. Why Generic Names?

- **Consistency**: All MCP servers follow the same pattern
- **Scaffolding**: Easy to copy structure for new servers
- **Clarity**: Files have clear, predictable purposes

## Creating a New MCP Server

### Step 1: Copy the Linear Server Structure

```bash
# Copy the linear server as a template
cp -r apps/linear-mcp-server apps/[new-domain]-mcp-server
```

### Step 2: Update Domain-Specific Files

#### `domain-types.ts`

Replace Linear-specific types with your domain types:

```typescript
// Before (Linear)
export interface LinearTeamResource {
  id: string;
  name: string;
  key: string;
}

// After (GitHub example)
export interface GitHubRepoResource {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
}
```

#### `domain-schemas.ts`

Replace Linear-specific schemas with your domain schemas:

```typescript
// Before (Linear)
export const SearchIssuesInputSchema = z.object({
  query: z.string().optional(),
  teamId: z.string().optional(),
  // ...
});

// After (GitHub example)
export const SearchReposInputSchema = z.object({
  query: z.string().optional(),
  language: z.string().optional(),
  // ...
});
```

### Step 3: Update Centralized InputSchemas

Add your server's inputSchemas to the `@mcp/schemas/input-schemas/` directory:

1. **Create your server's schema file**:

```bash
# Create a new file for your server
touch packages/schemas/src/mcp/input-schemas/github.ts
```

2. **Define your inputSchemas**:

```typescript
// packages/schemas/src/mcp/input-schemas/github.ts
import { ToolInputSchema } from "./types.js";
import { CommonInputSchemas } from "./common.js";

export const GitHubInputSchemas = {
  searchRepos: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for repositories",
      },
      language: {
        type: "string",
        description: "Filter by programming language",
      },
      limit: CommonInputSchemas.optionalLimit, // Reuse common patterns
      sortOrder: CommonInputSchemas.sortOrder,
    },
    required: ["query"],
    additionalProperties: false,
  } as ToolInputSchema,

  createIssue: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Issue title",
      },
      body: {
        type: "string",
        description: "Issue description",
      },
      repository: {
        type: "string",
        description: "Repository name (owner/repo)",
      },
    },
    required: ["title", "repository"],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
```

3. **Export your schemas**:

```typescript
// packages/schemas/src/mcp/input-schemas/index.ts
export * from "./types.js";
export * from "./common.js";
export * from "./linear.js";
export * from "./github.js"; // Add this line
```

## InputSchemas Directory Structure

```
packages/schemas/src/mcp/input-schemas/
├── types.ts           # ToolInputSchema interface
├── common.ts          # Reusable schema patterns
├── linear.ts          # Linear-specific schemas
├── github.ts          # GitHub-specific schemas (example)
├── slack.ts           # Slack-specific schemas (future)
├── notion.ts          # Notion-specific schemas (future)
└── index.ts           # Exports everything
```

### Benefits of This Structure

1. **Scalable**: Each server gets its own file (~100-200 lines)
2. **Maintainable**: Clear ownership and easy to find schemas
3. **Reusable**: Common patterns shared via `CommonInputSchemas`
4. **Type Safe**: Centralized types ensure consistency
5. **DRY**: No duplication of common patterns like `limit`, `sortOrder`

### Step 4: Register with Gateway

Add your server to the gateway configuration in `@mcp/capabilities`.

## Benefits of This Pattern

1. **Consistency**: All servers follow the same structure
2. **Type Safety**: Centralized schemas ensure type safety
3. **Reusability**: Common patterns are shared via `@mcp/schemas`
4. **Maintainability**: Clear separation of concerns
5. **Scaffolding**: Easy to create new servers

## Best Practices

1. **Keep domain-specific code in domain files**
2. **Use centralized schemas for inputSchemas**
3. **Follow the same handler pattern across servers**
4. **Maintain consistent error handling**
5. **Document your domain-specific APIs**

## Examples

- **Linear Server**: Issues, Teams, Users, Projects
- **GitHub Server**: Repos, Issues, Pull Requests, Actions
- **Slack Server**: Messages, Channels, Users, Workspaces
- **Notion Server**: Pages, Databases, Blocks, Users
