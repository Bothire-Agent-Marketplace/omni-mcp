# Enterprise MCP Server Pattern

This document defines the **standardized pattern** that all MCP servers in this project must follow. The Linear MCP server serves as the **gold standard** implementation using the **official MCP SDK pattern**.

## 🏗️ **Required Architecture**

```
servers/[service]-mcp-server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── config/
│   │   └── config.ts              # Environment configuration
│   └── mcp-server/
│       ├── server.ts              # Main server logic
│       ├── tools.ts               # MCP tool definitions
│       ├── resources.ts           # MCP resource definitions
│       └── prompts.ts             # MCP prompt definitions
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🎯 **1. Official MCP SDK Pattern (MANDATORY)**

### ✅ **CORRECT - Official MCP SDK Pattern**

All servers must use the official MCP SDK pattern with `server.registerTool()`, `server.registerResource()`, and `server.registerPrompt()`:

```typescript
// tools.ts - GOLD STANDARD PATTERN
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function registerTools(server: Server) {
  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
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
          required: ["query"],
        },
      },
    ],
  }));

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "service_search": {
        // Use Zod for input validation within the handler
        const SearchSchema = z.object({
          query: z.string(),
        });

        try {
          const { query } = SearchSchema.parse(args);

          // Your business logic here
          const results = await searchService(query);

          return {
            content: [
              {
                type: "text",
                text: `Found ${results.length} results for: ${query}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid search parameters: ${error}`
          );
        }
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  });
}
```

```typescript
// resources.ts - GOLD STANDARD PATTERN
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export function registerResources(server: Server) {
  // Register list_resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "service://entities",
        name: "Service Entities",
        description: "List of service entities",
        mimeType: "application/json",
      },
    ],
  }));

  // Register resource reading handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "service://entities": {
        const entities = await getServiceEntities();

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(entities, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
    }
  });
}
```

```typescript
// prompts.ts - GOLD STANDARD PATTERN
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export function registerPrompts(server: Server) {
  // Register list_prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "service_workflow",
        description: "Service workflow template",
        arguments: [
          {
            name: "task_type",
            description: "Type of task to create workflow for",
            required: true,
          },
        ],
      },
    ],
  }));

  // Register prompt generation handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "service_workflow": {
        const taskType = args?.task_type as string;

        return {
          description: `Service workflow for ${taskType}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Create a workflow for ${taskType} using our service.`,
              },
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
    }
  });
}
```

## 🔧 **2. Server Implementation Pattern**

```typescript
// server.ts - GOLD STANDARD PATTERN
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

export function createServiceMcpServer() {
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

  // Register all MCP primitives
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
```

## 🎨 **3. Environment Configuration Pattern**

All servers must use hierarchical environment variable loading:

```typescript
// config/config.ts
import { loadEnvHierarchy } from "@mcp/utils";

// Load environment variables with proper hierarchy
const env = loadEnvHierarchy();

export const CONFIG = {
  // Service-specific configuration
  API_KEY: env.SERVICE_API_KEY,
  BASE_URL: env.SERVICE_BASE_URL || "https://api.service.com",

  // Common configuration
  LOG_LEVEL: env.LOG_LEVEL || "info",
  NODE_ENV: env.NODE_ENV || "development",
} as const;

// Validation
if (!CONFIG.API_KEY) {
  console.error("❌ SERVICE_API_KEY environment variable is required");
  process.exit(1);
}
```

## 🚫 **4. Anti-Patterns (NEVER DO)**

1. ❌ **Shared schema dependencies** - Each server should be autonomous
2. ❌ **Complex type abstractions** - Use the official MCP SDK directly
3. ❌ **Mixing Zod with JSON Schema incorrectly** - Use Zod for validation within handlers only
4. ❌ **Over-engineering** - Keep it simple and follow official patterns
5. ❌ **Hardcoded environment variables** - Always use hierarchical config loading

## 🎯 **5. Validation Checklist**

Before submitting any MCP server:

- ✅ Uses official MCP SDK pattern with `server.registerTool()`, `server.registerResource()`, `server.registerPrompt()`
- ✅ Uses `server.setRequestHandler()` for all MCP request types
- ✅ Proper Zod validation within handlers (not as separate schemas)
- ✅ Clean separation: tools.ts, resources.ts, prompts.ts, server.ts
- ✅ Follows standard directory structure
- ✅ Includes proper TypeScript types
- ✅ Has Dockerfile for containerization
- ✅ Uses hierarchical environment variable loading
- ✅ Includes comprehensive README

## 🚀 **Benefits of This Pattern**

1. **Official Compliance**: Follows the official MCP SDK documentation exactly
2. **Simplicity**: No over-engineering or unnecessary abstractions
3. **Server Autonomy**: Each server is self-contained and independent
4. **Faster Development**: No shared dependency coordination needed
5. **Type Safety**: Proper Zod validation where it belongs
6. **Maintainability**: Clean, understandable code structure
7. **Scalability**: Easy to add new servers without affecting others

## 📖 **References**

- **Gold Standard**: `servers/linear-mcp-server/` (follow this exactly)
- **Official MCP SDK**: Uses `@modelcontextprotocol/sdk` correctly
- **Official Documentation**: Follows MCP specification patterns
