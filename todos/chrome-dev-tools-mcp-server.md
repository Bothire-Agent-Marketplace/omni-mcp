# Chrome DevTools MCP Server Analysis and Adaptation Guide

Based on my analysis of the Chrome DevTools MCP repository, here's a comprehensive guide on how to
adapt it to match your MCP server pattern for use with Cursor.

## Repository Overview

The Chrome DevTools MCP server is a **Python-based** MCP server that provides comprehensive Chrome
browser automation and debugging capabilities through the Chrome DevTools Protocol (CDP)[1]. It
offers 47 different tools across 7 categories, making it a robust solution for web development
debugging.

### Current Architecture

The repository uses a **modular Python architecture** with the following key components[2]:

- **Main Server**: `src/main.py` - MCP server initialization and tool registration
- **CDP Client**: `src/client.py` - Chrome DevTools Protocol client implementation
- **Context Manager**: `src/cdp_context.py` - Clean CDP client access pattern
- **Tool Modules**: `src/tools/` - Domain-specific tool implementations
- **Utilities**: Shared response formatting and error handling

## Key Features Analysis

### Chrome Management Tools

- **Cross-platform Chrome executable detection** - Automatically finds Chrome on macOS, Windows, and
  Linux
- **Browser startup with debugging enabled** - Launches Chrome with remote debugging port
- **Connection management with status monitoring** - Maintains persistent connections
- **URL navigation and session control** - Programmatic browser navigation

### Console Integration[2]

- **Real-time console log capture** - Monitors JavaScript console output
- **JavaScript execution in browser context** - Runs code directly in the browser
- **Object inspection and property analysis** - Deep inspection of JavaScript objects
- **Error categorization and summarization** - Organized error reporting

### Network Monitoring[2]

- **HTTP request/response capture** - Comprehensive network traffic analysis
- **Network traffic filtering** - Filter by domain, status code, etc.
- **Request body and response data access** - Complete HTTP transaction details

## Adaptation Strategy

### 1. Language Migration: Python → TypeScript

The repository needs to be converted from Python to TypeScript/JavaScript to align with your
Node.js-based MCP server pattern. Here's the mapping:

**Core Files**:

- `src/main.py` → `src/index.ts`
- `src/client.py` → `src/mcp-server/chrome-client.ts`
- `src/cdp_context.py` → `src/mcp-server/chrome-context.ts`
- `src/tools/utils.py` → `src/mcp-server/utils.ts`

**Tool Modules** (consolidate into handlers):

- All `src/tools/*.py` files → `src/mcp-server/handlers.ts`

### 2. Structure Alignment

Apply your MCP server pattern structure:

```
apps/chrome-devtools-mcp-server/
├── src/
│   ├── config/
│   │   └── config.ts              # Chrome debugging configuration
│   ├── types/
│   │   └── chrome-types.ts        # Chrome DevTools specific types
│   ├── schemas/
│   │   └── chrome-schemas.ts      # Zod validation schemas
│   ├── mcp-server/
│   │   ├── handlers.ts            # All Chrome DevTools handlers
│   │   ├── http-server.ts         # HTTP server setup
│   │   ├── tools.ts               # Tool definitions and exports
│   │   ├── resources.ts           # Resource definitions
│   │   ├── prompts.ts             # Prompt functions
│   │   ├── chrome-client.ts       # CDP client implementation
│   │   └── chrome-context.ts      # Context management
│   └── index.ts                   # Main entry point
├── package.json
└── tsconfig.json
```

### 3. Tool Categories Organization

The 47 tools should be organized into handlers by domain:

**Chrome Management** (6 tools):

- `start_chrome`, `connect_to_browser`, `navigate_to_url`, etc.

**Console Tools** (6 tools):

- `get_console_logs`, `execute_javascript`, `inspect_console_object`, etc.

**Network Monitoring** (2 tools):

- `get_network_requests`, `get_network_response`

**DOM Inspection** (10 tools):

- `get_document`, `query_selector`, `get_element_attributes`, etc.

**CSS Analysis** (10 tools):

- `get_computed_styles`, `get_matched_styles`, `start_css_coverage_tracking`, etc.

**Storage Management** (10 tools):

- `get_all_cookies`, `clear_storage_for_origin`, `track_indexeddb`, etc.

**Performance Metrics** (3 tools):

- `get_page_info`, `get_performance_metrics`, `evaluate_in_all_frames`

### 4. Key Adaptations Required

**Configuration Management**[2]:

```typescript
// src/config/config.ts
export interface ChromeDevToolsConfig {
  debugPort: number;
  chromeExecutablePath?: string;
  headless: boolean;
  userDataDir?: string;
}
```

**Type Definitions**:

```typescript
// src/types/chrome-types.ts
export interface ChromeConnectionStatus {
  connected: boolean;
  port: number;
  targetInfo?: any;
}

export interface ConsoleLogEntry {
  type: string;
  args: any[];
  timestamp: number;
}
```

**Schema Validation**:

```typescript
// src/schemas/chrome-schemas.ts
export const StartChromeRequestSchema = z.object({
  port: z.number().optional().default(9222),
  url: z.string().optional(),
  headless: z.boolean().optional().default(false),
  chromePath: z.string().optional(),
  autoConnect: z.boolean().optional().default(false),
});
```

**Handler Implementation**:

```typescript
// src/mcp-server/handlers.ts
export async function handleStartChrome(chromeClient: ChromeDevToolsClient, params: unknown) {
  const { port, url, headless, chromePath, autoConnect } = StartChromeRequestSchema.parse(params);

  // Implementation adapted from Python version
  return await chromeClient.startChrome({
    port,
    url,
    headless,
    chromePath,
    autoConnect,
  });
}
```

### 5. Dependencies and Integration

**Package.json dependencies**:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.0",
    "chrome-remote-interface": "^0.33.0",
    "puppeteer-core": "^21.0.0",
    "ws": "^8.14.0",
    "zod": "^3.22.0"
  }
}
```

**Cursor Integration**:

- Use the standardized MCP server pattern for consistent integration
- Implement proper error handling and response formatting
- Maintain the robust tool functionality from the original Python version

### 6. Error Handling Pattern

Preserve the excellent error handling from the original:

```typescript
// src/mcp-server/utils.ts
export function createSuccessResponse<T>(message: string, data?: T): MCPResponse<T> {
  return {
    success: true,
    message,
    timestamp: Date.now(),
    data,
  };
}

export function createErrorResponse(error: string, details?: string): MCPErrorResponse {
  return {
    success: false,
    error,
    details,
    timestamp: Date.now(),
  };
}
```

## Implementation Priority

1. **Core Chrome Management** - Start with browser connection and basic navigation
2. **Console Tools** - Essential for debugging JavaScript applications
3. **Network Monitoring** - Critical for API debugging
4. **DOM Inspection** - Important for frontend development
5. **CSS Analysis** - Valuable for styling debugging
6. **Storage Management** - Useful for authentication and data persistence
7. **Performance Metrics** - Advanced debugging capabilities

## Benefits of This Adaptation

1. **Comprehensive Browser Control**: 47 tools covering all aspects of web development
2. **Robust Error Handling**: Proven patterns from the original implementation
3. **Cross-Platform Support**: Works on macOS, Windows, and Linux
4. **Cursor Integration**: Follows your standardized MCP server pattern
5. **Type Safety**: Full TypeScript implementation with Zod validation
6. **Developer Experience**: Rich debugging capabilities for web applications

This adaptation would create a powerful Chrome DevTools MCP server that integrates seamlessly with
Cursor while maintaining all the robust functionality of the original Python implementation.
