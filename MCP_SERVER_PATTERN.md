# Enterprise MCP Server Pattern

This document defines the **standardized pattern** that all MCP servers in this project must follow. The Linear MCP server serves as the **gold standard** implementation.

## 🏗️ **Required Architecture**

```
servers/[service]-mcp-server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── config/
│   │   └── config.ts              # Environment configuration
│   └── mcp-server/
│       ├── server.ts              # Main server logic
│       ├── tools.ts               # Tool definitions (using shared schemas)
│       ├── resources.ts           # Resource definitions (using shared schemas)
│       ├── prompts.ts             # Prompt definitions (using shared schemas)
│       └── tools/
│           └── [service]-tools.ts # Tool implementations
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🎯 **1. Shared Type System Usage (MANDATORY)**

### ❌ **WRONG - Local Type Definitions**

```typescript
// DON'T DO THIS - redefining types locally
interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

export const TOOLS = [
  {
    name: "service_action",
    description: "Local definition",
    // ... schema definition
  },
] as const;
```

### ✅ **CORRECT - Shared Types from @mcp/schemas**

```typescript
// tools.ts - GOLD STANDARD PATTERN
import { LINEAR_TOOLS, ToolDefinition } from "@mcp/schemas";

// Use standardized tool definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const TOOLS: readonly ToolDefinition[] = LINEAR_TOOLS;
```

```typescript
// resources.ts - GOLD STANDARD PATTERN
import { LINEAR_RESOURCES, ResourceDefinition } from "@mcp/schemas";

// Use standardized resource definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const RESOURCES: readonly ResourceDefinition[] = LINEAR_RESOURCES;
```

```typescript
// prompts.ts - GOLD STANDARD PATTERN
import { LINEAR_PROMPTS, PromptDefinition } from "@mcp/schemas";

// Use standardized prompt definitions from shared schemas
// This ensures consistency across all MCP servers in the project
export const PROMPTS: readonly PromptDefinition[] = LINEAR_PROMPTS;
```

## 🔧 **2. Tool Implementation Pattern**

### Main Tools Class

```typescript
// tools/[service]-tools.ts
import { McpResponse, SearchArgs, CreateArgs, UpdateArgs } from "@mcp/schemas";

export class ServiceTools {
  private client: ServiceClient;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Service API key is required");
    this.client = new ServiceClient({ apiKey });
  }

  // MANDATORY: Use _execute wrapper for consistent error handling
  private async _execute<T = any>(
    toolName: string,
    logic: () => Promise<T>
  ): Promise<McpResponse<T>> {
    console.log(`Executing tool: ${toolName}`);
    try {
      const data = await logic();
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in ${toolName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // MANDATORY: All tools must return McpResponse<T>
  async service_search(args: Partial<SearchArgs> = {}): Promise<McpResponse> {
    return this._execute("service_search", async () => {
      // Implementation logic here
      return results;
    });
  }

  async service_create(args: CreateArgs): Promise<McpResponse> {
    return this._execute("service_create", async () => {
      // Implementation logic here
      return result;
    });
  }
}
```

## 📋 **3. Server Implementation Pattern**

```typescript
// server.ts
import { McpServerInterface, McpResponse } from "@mcp/schemas";
import { TOOLS } from "./tools.js";
import { RESOURCES } from "./resources.js";
import { PROMPTS } from "./prompts.js";

export function createServiceMcpServer(): McpServerInterface {
  const server = new Server(
    {
      name: "service-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  const serviceTools = new ServiceTools(CONFIG.API_KEY!);

  // MANDATORY: Use shared type definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES,
  }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS,
  }));

  return server;
}
```

## 🎨 **4. Shared Schema Definition Pattern**

All tool/resource/prompt definitions MUST be created in `shared/schemas/src/[service]/mcp-types.ts`:

```typescript
// shared/schemas/src/[service]/mcp-types.ts
import {
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
} from "../mcp/types.js";

export const SERVICE_TOOLS: readonly ToolDefinition[] = [
  {
    name: "service_search",
    description: "Search service entities",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
      },
    },
  },
] as const;

export const SERVICE_RESOURCES: readonly ResourceDefinition[] = [
  {
    uri: "service://entities",
    name: "Service Entities",
    description: "List of service entities",
    mimeType: "application/json",
  },
] as const;

export const SERVICE_PROMPTS: readonly PromptDefinition[] = [
  {
    name: "service_workflow",
    description: "Service workflow template",
    arguments: [],
  },
] as const;
```

## 🚫 **5. Anti-Patterns (NEVER DO)**

1. ❌ **Local type definitions** - Always import from `@mcp/schemas`
2. ❌ **Inconsistent error handling** - Always use `_execute()` wrapper
3. ❌ **Missing McpResponse<T>** - All tools must return standardized responses
4. ❌ **Direct API responses** - Always transform to match schemas
5. ❌ **Hardcoded schemas** - Always use shared definitions

## 🎯 **6. Validation Checklist**

Before submitting any MCP server:

- ✅ Uses `@mcp/schemas` imports (no local type definitions)
- ✅ All tools return `McpResponse<T>` format
- ✅ Uses `_execute()` wrapper for error handling
- ✅ Tool/Resource/Prompt definitions in shared schemas
- ✅ Follows standard directory structure
- ✅ Includes proper TypeScript types
- ✅ Has Dockerfile for containerization
- ✅ Includes comprehensive README

## 🚀 **Benefits of This Pattern**

1. **Type Safety**: Shared types prevent runtime errors
2. **Consistency**: All MCP servers behave identically
3. **Maintainability**: Changes to types propagate everywhere
4. **Scalability**: Easy to add new servers following the pattern
5. **Documentation**: Self-documenting through shared schemas
6. **Testing**: Standardized response formats enable universal testing

## 📖 **References**

- **Gold Standard**: `servers/linear-mcp-server/` (follow this exactly)
- **Shared Types**: `shared/schemas/src/mcp/types.ts`
- **Linear Example**: `shared/schemas/src/linear/mcp-types.ts`
