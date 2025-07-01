# Enterprise MCP Server Pattern: HTTP Edition

This document defines the **standardized, serverless-ready pattern** that all new MCP servers in this project must follow. The Linear MCP server serves as the **gold standard** implementation. This pattern decouples business logic from the transport layer, allowing servers to run as standalone HTTP microservices or be deployed as FaaS functions.

## 🏗️ **Required Architecture**

```
servers/[service]-mcp-server/
├── src/
│   ├── index.ts                    # Entry point: starts the HTTP server
│   ├── config/
│   │   └── config.ts               # Environment configuration
│   └── mcp-server/
│       ├── http-server.ts          # NEW: Express.js server (transport layer)
│       ├── handlers.ts             # NEW: Core business logic handlers
│       ├── tools.ts                # MCP tool definitions (wiring layer)
│       ├── resources.ts            # MCP resource definitions (wiring layer)
│       └── prompts.ts              # MCP prompt definitions (wiring layer)
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🎯 **1. The Handler Pattern (Business Logic)**

The core of the server is a set of transport-agnostic handler functions. Each handler is a self-contained unit that takes validated parameters and returns a result.

### ✅ **CORRECT - Handler Pattern**

```typescript
// mcp-server/handlers.ts - GOLD STANDARD PATTERN
import { z } from "zod";
import { McpError, ErrorCode } from "@mcp/utils"; // Assuming a shared error utility

// Define input schema with Zod for validation
const SearchSchema = z.object({
  query: z.string(),
});

// Implement the handler function
export async function handleServiceSearch(params: unknown) {
  try {
    const { query } = SearchSchema.parse(params);

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
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid search parameters: ${error.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }
    // Re-throw other errors
    throw error;
  }
}

// Another example for getting entities
export async function handleGetEntities(params: unknown) {
  const entities = await getServiceEntities();
  return {
    contents: [
      {
        uri: "service://entities",
        mimeType: "application/json",
        text: JSON.stringify(entities, null, 2),
      },
    ],
  };
}
```

## 🔌 **2. The HTTP Server Pattern (Transport Layer)**

The handlers are exposed to the network via an Express.js server. This server is responsible for routing, request/response handling, and health checks.

### ✅ **CORRECT - HTTP Server Pattern**

```typescript
// mcp-server/http-server.ts - GOLD STANDARD PATTERN
import express from "express";
import cors from "cors";
import * as handlers from "./handlers.js";

// A simple mapping from MCP method names to their handler functions.
const handlerMap: Record<string, (params: any) => Promise<any>> = {
  // Tool handlers
  service_search: handlers.handleServiceSearch,
  // Resource handlers could also be mapped if they take params
  "resources/read/service://entities": handlers.handleGetEntities,
};

export function createHttpServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Main MCP endpoint for tool calls
  app.post("/mcp", async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== "2.0" || !method || method !== "tools/call") {
      // Basic validation
      return res.status(400).json({ error: { message: "Invalid Request" } });
    }

    const toolName = params?.name;
    const handler = handlerMap[toolName];

    if (!handler) {
      return res.status(404).json({ error: { message: "Method not found" } });
    }

    try {
      const result = await handler(params?.arguments || {});
      res.json({ jsonrpc: "2.0", id, result });
    } catch (error: any) {
      res.status(500).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: "Internal error", data: error.message },
      });
    }
  });

  return app;
}
```

## 🚀 **3. Entry Point**

The `index.ts` file just starts the HTTP server.

```typescript
// index.ts - GOLD STANDARD PATTERN
import { createMcpLogger } from "@mcp/utils";
import { startHttpServer } from "./mcp-server/http-server.js";
import { CONFIG } from "./config/config.js";

const logger = createMcpLogger(CONFIG.SERVICE_NAME);

logger.info("MCP server starting up");
startHttpServer();
```

## 🎨 **4. Environment Configuration Pattern**

This pattern remains unchanged and is crucial for providing secrets and configuration to the handlers.

```typescript
// config/config.ts - REMAINS GOLD STANDARD
import { loadEnvHierarchy } from "@mcp/utils";

// Load environment variables with proper hierarchy
const env = loadEnvHierarchy();

export const CONFIG = {
  SERVICE_NAME: "service-mcp-server",
  API_KEY: env.SERVICE_API_KEY,
  BASE_URL: env.SERVICE_BASE_URL || "https://api.service.com",
  LOG_LEVEL: env.LOG_LEVEL || "info",
  NODE_ENV: env.NODE_ENV || "development",
  PORT: env.PORT || 3001,
} as const;

// Validation
if (!CONFIG.API_KEY) {
  console.error("❌ SERVICE_API_KEY environment variable is required");
  process.exit(1);
}
```

## 🚫 **5. Anti-Patterns (NEVER DO)**

1.  ❌ **Mixing business logic in `http-server.ts`** - Keep the transport layer clean. All logic goes in `handlers.ts`.
2.  ❌ **Using the old MCP SDK `Server` class for HTTP services** - The SDK's server is for stdio-based transport.
3.  ❌ **Hardcoding URLs or ports** - Always use environment variables via the `config.ts` pattern.
4.  ❌ **Creating complex routing logic** - The gateway handles smart routing. The MCP server should have a simple `/mcp` endpoint.

## 🎯 **6. Validation Checklist**

Before submitting any MCP server:

- ✅ **Serverless-Ready**: Business logic is in transport-agnostic `handlers.ts`.
- ✅ **HTTP Transport**: Uses Express.js in `http-server.ts` to expose handlers.
- ✅ **Health Check**: Implements a `/health` endpoint.
- ✅ **Clean Entrypoint**: `index.ts` only starts the server.
- ✅ **Follows Standard Directory Structure**: Includes `http-server.ts` and `handlers.ts`.
- ✅ **Uses Hierarchical Config**: Gets all config from `config/config.ts`.
- ✅ **Has Dockerfile**: The `Dockerfile` is updated to expose the `PORT` and run the HTTP server.
- ✅ **Comprehensive README**: The `README.md` explains how to run the server and what environment variables it needs.
- ✅ **(Optional) Wiring Files**: `tools.ts`, `resources.ts`, `prompts.ts` can still be used to provide metadata to the gateway, but they are no longer the execution layer.

## 🚀 **Benefits of This Pattern**

1.  **Serverless-Ready**: Handlers can be deployed to FaaS platforms with minimal changes.
2.  **Scalable**: Standard HTTP allows for easy load balancing and scaling.
3.  **Testable**: Business logic handlers can be unit-tested without a running server.
4.  **Maintainable**: Clear separation of concerns between transport and logic.
5.  **Interoperable**: Any HTTP client can interact with the server.

## 📖 **References**

- **Gold Standard**: `servers/linear-mcp-server/` (follow this exactly)
- **Official MCP SDK**: Uses `@modelcontextprotocol/sdk` correctly
- **Official Documentation**: Follows MCP specification patterns
