# MCP Server Pattern

This document defines the core architectural pattern for MCP servers in this project.

## Core Principle: Separation of Concerns

**Transport Layer** → **Business Logic** → **Data Layer**

- **Transport**: HTTP server handles requests/responses, routing, validation
- **Business Logic**: Pure functions that implement actual functionality
- **Data**: External APIs, databases, file systems

## Key Concepts

### 1. Transport-Agnostic Handlers

Business logic lives in pure functions that:

- Accept validated parameters
- Return structured results
- Are independent of HTTP/stdio transport
- Can be unit tested in isolation

### 2. HTTP-First Architecture

- Primary transport is HTTP (Fastify)
- Enables serverless deployment
- Supports standard REST tooling
- Allows easy scaling and load balancing

### 3. Environment-Driven Configuration

- All configuration via environment variables
- Hierarchical loading (local → env → secrets)
- Fail fast on missing required config
- No hardcoded values

### 4. Validation at Boundaries

- Use Zod for runtime validation of external input
- TypeScript types for internal contracts
- Validate early, fail fast
- Clear error messages

## Standard Structure

```
apps/[service]-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/config.ts      # Environment config
│   └── mcp-server/
│       ├── http-server.ts    # HTTP transport layer
│       ├── handlers.ts       # Business logic
│       ├── tools.ts          # Tool definitions
│       ├── resources.ts      # Resource definitions
│       └── prompts.ts        # Prompt definitions
```

## Anti-Patterns

- ❌ Business logic in transport layer
- ❌ Transport-specific code in handlers
- ❌ Hardcoded configuration
- ❌ Missing input validation
- ❌ Mixing concerns across layers

## Benefits

- **Serverless Ready**: Handlers deploy to FaaS platforms
- **Testable**: Business logic isolated from transport
- **Scalable**: Standard HTTP enables load balancing
- **Maintainable**: Clear separation of concerns
- **Interoperable**: Any HTTP client can interact

## Reference Implementation

See `apps/linear-mcp-server/` for the gold standard implementation of this pattern.
