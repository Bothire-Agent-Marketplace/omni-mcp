# MCP Server Pattern Documentation

## Overview

This document describes the standardized pattern for creating MCP servers in this monorepo, updated
to reflect our **consolidated server factory pattern** with database-driven configuration system.

**🎉 Major Update:** All MCP servers now use a unified factory pattern that eliminates 68% of
boilerplate code while maintaining full database-driven functionality.

## Fundamental Differences: Tools, Resources, and Prompts in MCP Servers

MCP (Model Context Protocol) servers expose three core concepts—**tools**, **resources**, and
**prompts**—each serving a distinct role in enabling AI agents to interact with external systems and
data.

### 1. Tools

- **Definition:** Executable functions or actions that an MCP server exposes to clients
- **Purpose:** Enable automation, integration, and active manipulation of data or systems
- **Type:** Action-oriented - for **doing things**
- **Usage:** Invoked with arguments, returns result after execution
- **Mutability:** Changes state or triggers effects
- **Examples:**
  - `calculate_sum` - Performs mathematical operations
  - `send_email` - Triggers email delivery
  - `create_issue` - Creates new Linear/GitHub issues
  - `deploy_app` - Triggers deployment workflows

### 2. Resources

- **Definition:** Data objects or content that an MCP server makes available for read-only access
- **Purpose:** Supply passive information that can be referenced, analyzed, or summarized by AI
- **Type:** Data-oriented - for **knowing things**
- **Usage:** Fetched/listed by client, not executed
- **Mutability:** Passive, no side effects
- **Examples:**
  - File contents from repositories
  - Database records and query results
  - API responses and cached data
  - Documentation and knowledge bases

### 3. Prompts

- **Definition:** Structured, reusable message templates designed to guide interactions between AI
  agents and users
- **Purpose:** Standardize and streamline common interactions with dynamic arguments and context
- **Type:** Communication-oriented - for **saying things** in a structured way
- **Usage:** Requested by name with arguments, returns formatted message(s)
- **Mutability:** Declarative, no direct side effects
- **Examples:**
  - `explain-code` - Template for code explanation requests
  - `generate-summary` - Template for summarizing content
  - `create-commit-message` - Template for git commit formatting
  - `review-pull-request` - Template for code review guidance

### Quick Reference Table

| Feature          | Tools                  | Resources           | Prompts                    |
| ---------------- | ---------------------- | ------------------- | -------------------------- |
| **Purpose**      | Perform operations     | Provide context     | Guide interactions         |
| **Action**       | Execute with arguments | Fetch/list data     | Request formatted messages |
| **Nature**       | Active (doing)         | Passive (knowing)   | Structured (saying)        |
| **Side Effects** | Yes - changes state    | No - read-only      | No - declarative           |
| **Example Use**  | "Create a new issue"   | "Get file contents" | "Format commit message"    |

**In summary:** Tools are for doing things, Resources are for knowing things, and Prompts are for
saying things in a structured way.

## File Structure Template

When creating a new MCP server, follow this **consolidated factory pattern** structure (no
per-server schemas):

```
apps/[domain]-mcp-server/
├── src/
│   ├── config/
│   │   └── config.ts              # Server configuration
│   ├── types/
│   │   └── domain-types.ts        # Domain-specific TypeScript types (optional)
│   ├── mcp-server/
│   │   ├── handlers.ts            # Business logic handlers (optional)
│   │   ├── http-server.ts         # HTTP server setup (using createMcpServer factory)
│   │   └── tools.ts               # Tool definitions and exports
│   │
│   └── index.ts                   # Main entry point
├── package.json
└── tsconfig.json
```

**Key Changes:**

- **Centralized Schemas** - Input schemas live in `@mcp/schemas` only (Zod-first with JSON Schema
  generation)
- **No Per-Server Schemas** - Do not create `src/schemas/domain-schemas.ts` in apps; remove any
  legacy copies
- **Simplified structure** - Many files are optional due to factory pattern
- **68% less boilerplate** - Factory handles database lookup, dynamic handlers, etc.
- **Consistent patterns** - All servers use identical factory-based setup

## 🔄 **CONSOLIDATED FACTORY PATTERN (Latest Architecture)**

### Evolution of MCP Server Patterns

**Previous Pattern (Manual Setup):**

```bash
# ❌ OLD - Manual server setup (70+ lines of boilerplate per server)
├── mcp-server/
│   ├── http-server.ts # Manual createEnhancedMcpHttpServer setup
│   ├── handlers.ts    # Manual database lookup logic
│   └── tools.ts       # Manual handler registration
```

**New Pattern (Consolidated Factory):**

```bash
# ✅ NEW - Consolidated factory pattern (22 lines per server)
├── mcp-server/
│   ├── http-server.ts # Uses createMcpServer factory (simple)
│   └── tools.ts       # Just tool definitions - factory handles the rest
```

### Key Benefits of Consolidated Factory Pattern

1. **68% Less Boilerplate**: 70 lines → 22 lines per server
2. **Single Source of Truth**: Database contains all prompts/resources
3. **Zero Configuration Drift**: Standardized setup across all servers
4. **Hot Reloading**: Changes take effect without server restarts
5. **Multi-tenant Ready**: Organization-specific customization built-in
6. **Version Control**: Full audit trail and rollback capability
7. **Admin UI**: Web interface for managing prompts/resources
8. **Eliminates Duplication**: No more copy-paste server setup code

### Integration with Consolidated Server Factory

All MCP servers now use the consolidated factory from `@mcp/server-core`:

```typescript
// apps/[domain]-mcp-server/src/mcp-server/http-server.ts
import { createMcpServerWithClient } from "@mcp/server-core";
import type { DomainServerConfig } from "../config/config.js";
import { DomainClient } from "./domain-client.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createDomainHttpServer(config: DomainServerConfig): Promise<FastifyInstance> {
  const domainClient = new DomainClient({ apiKey: config.domainApiKey });

  // Use consolidated factory - eliminates 50+ lines of boilerplate
  return createMcpServerWithClient({
    serverName: "domain",
    serverKey: "domain",
    config,
    client: domainClient,
    createToolHandlers,
    getAvailableTools,
    // Resources and prompts are fully dynamic from database
    // No need to specify empty handlers or dynamic setup - factory handles it
  });
}
```

**For servers without clients:**

```typescript
// apps/perplexity-mcp-server/src/mcp-server/http-server.ts
import { createMcpServerWithoutClient } from "@mcp/server-core";

export async function createPerplexityHttpServer(
  config: PerplexityServerConfig
): Promise<FastifyInstance> {
  return createMcpServerWithoutClient({
    serverName: "perplexity",
    serverKey: "perplexity",
    config,
    createToolHandlers,
    getAvailableTools,
  });
}
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

### Quick Start with Scaffolding Tool

Use the automated scaffolding tool to create a new MCP server:

```bash
# Create a new MCP server (e.g., GitHub)
node scripts/scaffold-mcp-server.js add github

# The tool will automatically:
# 1. Create the server directory structure
# 2. Generate all template files with DATABASE-DRIVEN pattern
# 3. Create input schemas in @mcp/schemas
# 4. Register with @mcp/capabilities
# 5. Update configuration files
# 6. Install dependencies
# 7. Build and validate the server
```

### What Gets Generated (Updated)

The scaffolding tool creates a complete, working MCP server with:

- **Server Structure**: All directories and files following the **CONSOLIDATED FACTORY PATTERN**
- **Factory-Based Server**: Uses `createMcpServer` factory eliminating 68% of boilerplate
- **Template Handlers**: Placeholder API handlers with proper error handling
- **Input Schemas**: Centralized schemas in `@mcp/schemas/input-schemas/[domain].ts`
- **Capabilities Registration**: Auto-registration in `@mcp/capabilities`
- **Configuration**: Environment variables, TypeScript config, and dependency setup
- **Validation**: Builds successfully and passes startup tests
- **Database Integration**: Automatic prompts/resources loading via factory
- **Minimal Code**: Just 22 lines for full server setup instead of 70+

### Customization After Scaffolding

After running the scaffolding tool, customize these files for your domain:

#### 1. Update API Handlers (`src/mcp-server/handlers.ts`)

Replace placeholder logic with real API calls:

```typescript
// Replace placeholder with real API client
import { GitHubClient } from "@github/sdk";

export async function handleGitHubSearchRepos(githubClient: GitHubClient, params: unknown) {
  const { query, language, limit } = SearchReposRequestSchema.parse(params);
  const results = await githubClient.search.repos({ query, language, limit });
  // ... return formatted results
}
```

#### 2. Update Domain Types (`src/types/domain-types.ts`)

Add your domain-specific TypeScript interfaces:

```typescript
export interface GitHubRepoResource {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  language: string | null;
  stars: number;
}
```

#### 3. Update HTTP Server (`src/mcp-server/http-server.ts`)

Use the consolidated factory pattern:

```typescript
import { createMcpServerWithClient } from "@mcp/server-core";
import type { GitHubServerConfig } from "../config/config.js";
import { GitHubClient } from "./github-client.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

export async function createGitHubHttpServer(config: GitHubServerConfig): Promise<FastifyInstance> {
  const githubClient = new GitHubClient({ token: config.githubToken });

  // Consolidated factory eliminates 50+ lines of boilerplate
  return createMcpServerWithClient({
    serverName: "github",
    serverKey: "github",
    config,
    client: githubClient,
    createToolHandlers,
    getAvailableTools,
  });
}
```

#### 4. Define/Update Schemas in `@mcp/schemas`

- Add or edit Zod schemas in `packages/schemas/src/mcp/zod/[domain].ts` (canonical source)
- Export matching JSON input schemas in `packages/schemas/src/mcp/input-schemas/[domain].ts`
- Never add runtime Zod schemas inside app servers

### Additional Commands

```bash
# List all registered servers
node scripts/scaffold-mcp-server.js list

# Remove a server completely
node scripts/scaffold-mcp-server.js remove github

# Test the server through the gateway
node packages/dev-tools/src/cli/index.js test-server github
```

## Managing Prompts and Resources

### Database Management

Prompts and resources are now managed through:

1. **Database Tables**:
   - `DefaultPrompt` / `DefaultResource` - System-wide defaults
   - `OrganizationPrompt` / `OrganizationResource` - Custom per-organization

2. **Admin UI**: `http://localhost:3000/organization/settings/prompts`
   - Create, edit, delete prompts/resources
   - Test prompt templates with variable substitution
   - Version tracking and rollback
   - Organization-specific customization

3. **API Endpoints**:
   ```bash
   # List prompts via MCP protocol
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer dev-api-key-12345" \
     -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list","params":{}}' \
     http://localhost:37373/mcp
   ```

### Seeding Default Prompts/Resources

Add system defaults via database seed scripts:

```typescript
// packages/database/prisma/seed-prompts-resources.ts
const githubPrompts = [
  {
    name: "create_pull_request_workflow",
    description: "Step-by-step workflow for creating GitHub pull requests",
    template: [{ role: "user", content: "Help me create a pull request for {{repository}}" }],
    arguments: {
      repository: { type: "string", required: true, description: "Repository name" },
    },
    mcpServerName: "github",
  },
];
```

## InputSchemas Directory Structure

```
packages/schemas/src/mcp/input-schemas/
├── types.ts           # ToolInputSchema interface
├── common.ts          # Reusable schema patterns
├── linear.ts          # Linear tool input schemas (JSON) ← generated from Zod
├── perplexity.ts      # Perplexity tool input schemas (JSON)
├── devtools.ts        # DevTools tool input schemas (JSON)
├── notion.ts          # Notion tool input schemas (JSON)
└── index.ts           # Exports everything (auto-updated)
```

## Zod-first, JSON-schema at the edge

- Canonical Zod schemas live in `packages/schemas/src/mcp/zod/*.ts`
- Protocol-facing JSON schemas live in `packages/schemas/src/mcp/input-schemas/*.ts`
- JSON schemas are produced from Zod (or authored explicitly) and exported to clients via the
  gateway
- App servers consume only the JSON input schemas from `@mcp/schemas` and should not import Zod
  directly

### Benefits of Automated Scaffolding

1. **Speed**: Create a working server in seconds, not hours
2. **Consistency**: All servers follow identical DATABASE-DRIVEN patterns
3. **Validation**: Generated servers build and start successfully
4. **Integration**: Automatic registration with gateway and capabilities
5. **Best Practices**: Templates include database integration and dynamic loading

## Benefits of Consolidated Factory Pattern

1. **68% Less Boilerplate**: From 70+ lines to just 22 lines per server
2. **Consistency**: All servers follow identical factory-based structure
3. **Type Safety**: Centralized schemas and factory ensure type safety
4. **Reusability**: All common patterns handled by factory in `@mcp/server-core`
5. **Maintainability**: Single source of truth for server creation patterns
6. **Scalability**: Database caching and multi-tenant support built-in
7. **Hot Reloading**: Changes take effect without deployment
8. **Admin UI**: User-friendly management interface
9. **Developer Experience**: Dramatically simplified server creation
10. **Zero Configuration Drift**: Factory ensures consistent behavior

## Best Practices

1. **Use Consolidated Factory**: Always use `createMcpServer`, `createMcpServerWithClient`, or
   `createMcpServerWithoutClient`
2. **No Static Config**: Never create static prompts.ts or resources.ts files
3. **Factory Pattern**: Let the factory handle database integration, dynamic handlers, and server
   setup
4. **Organization Context**: Multi-tenant scenarios handled automatically by factory
5. **Version Control**: Use database versioning for prompts/resources
6. **Admin UI First**: Manage prompts/resources through the web interface
7. **Minimal Code**: Keep server setup minimal - factory handles complexity
8. **Centralized Schemas**: Use `@mcp/schemas` exclusively for tool input schemas (Zod in `zod/`,
   JSON in `input-schemas/`)
9. **Tool Handlers Only**: Focus only on business logic - factory handles infrastructure

## Examples

Current servers using the **CONSOLIDATED FACTORY PATTERN**:

- **✅ Linear Server**: Issues, Teams, Users, Projects + Dynamic Prompts/Resources (22 lines setup)
- **✅ Perplexity Server**: Search, Research, Compare + Dynamic Prompts/Resources (18 lines setup)
- **✅ DevTools Server**: Chrome automation + Dynamic Prompts/Resources (25 lines setup)

All servers now use the same factory pattern with **68% less boilerplate** than before.

Future servers will follow the same consolidated pattern:

- **GitHub Server**: Repos, Issues, Pull Requests, Actions + Factory-based setup
- **Slack Server**: Messages, Channels, Users, Workspaces + Factory-based setup
- **Notion Server**: Pages, Databases, Blocks, Users + Factory-based setup

### Real Examples from Codebase

**Linear Server (with client):**

```typescript
export async function createLinearHttpServer(config: LinearServerConfig): Promise<FastifyInstance> {
  const linearClient = new LinearClient({ apiKey: config.linearApiKey });

  return createMcpServerWithClient({
    serverName: "linear",
    serverKey: "linear",
    config,
    client: linearClient,
    createToolHandlers,
    getAvailableTools,
  });
}
```

**Perplexity Server (without client):**

```typescript
export async function createPerplexityHttpServer(
  config: PerplexityServerConfig
): Promise<FastifyInstance> {
  return createMcpServerWithoutClient({
    serverName: "perplexity",
    serverKey: "perplexity",
    config,
    createToolHandlers,
    getAvailableTools,
  });
}
```

## Migration Guide

If you have existing servers with manual setup or static files:

### 1. Remove Static Files & Manual Setup

```bash
# Remove old static files
rm src/mcp-server/prompts.ts
rm src/mcp-server/resources.ts
```

### 2. Replace Manual Server Setup with Factory

**Old manual setup (70+ lines):**

```typescript
// ❌ OLD - Manual setup
import { createEnhancedMcpHttpServer, DatabaseDynamicHandlerRegistry } from "@mcp/server-core";

const dynamicHandlers = new DatabaseDynamicHandlerRegistry(serverId, configLoader);
const server = createEnhancedMcpHttpServer({
  serverName: "domain",
  config,
  client: domainClient,
  dynamicHandlers,
  fallbackHandlers: { toolHandlers, resourceHandlers: {}, promptHandlers: {} },
  getAvailableTools,
  getAvailableResources: async (context) => dynamicHandlers.getAvailableResources(context),
  getAvailablePrompts: async (context) => dynamicHandlers.getAvailablePrompts(context),
});
```

**New factory pattern (22 lines):**

```typescript
// ✅ NEW - Factory pattern
import { createMcpServerWithClient } from "@mcp/server-core";

return createMcpServerWithClient({
  serverName: "domain",
  serverKey: "domain",
  config,
  client: domainClient,
  createToolHandlers,
  getAvailableTools,
});
```

### 3. Update Dependencies

Remove unused dependencies that the factory now handles:

```json
{
  "dependencies": {
    // Remove these - factory handles them
    // "@mcp/config-service": "workspace:*", ❌
    // "@mcp/database": "workspace:*", ❌

    // Keep these
    "@mcp/server-core": "workspace:*", // ✅
    "@mcp/utils": "workspace:*" // ✅
  }
}
```

### 4. Test Factory Pattern

```bash
# Verify factory-based server works correctly
curl -X POST -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key-12345" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  http://localhost:37373/mcp
```

### 5. Benefits After Migration

- **68% less code** in your server setup
- **Zero configuration drift** - factory ensures consistency
- **Automatic database integration** - no manual setup required
- **Hot reloading** - changes take effect immediately
- **Simplified maintenance** - factory handles complexity

**The consolidated factory pattern is now the standard for all MCP servers!** 🎉
