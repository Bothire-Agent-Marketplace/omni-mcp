# MCP Server Pattern Documentation

## Overview

This document describes the standardized pattern for creating MCP servers in this monorepo, updated
to reflect our **database-driven configuration system**.

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

When creating a new MCP server, follow this **database-driven** structure:

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
│   │   ├── http-server.ts         # HTTP server setup (using createEnhancedMcpHttpServer)
│   │   └── tools.ts               # Tool definitions and exports
│   │
│   └── index.ts                   # Main entry point
├── package.json
└── tsconfig.json
```

## 🔄 **DATABASE-DRIVEN ARCHITECTURE (Updated Pattern)**

### What Changed

**Previous Pattern (Static):**

```bash
# ❌ OLD - Static files (removed)
├── mcp-server/
│   ├── prompts.ts     # Static prompt definitions (REMOVED)
│   ├── resources.ts   # Static resource definitions (REMOVED)
```

**New Pattern (Database-Driven):**

```bash
# ✅ NEW - Dynamic loading from database
├── mcp-server/
│   ├── http-server.ts # Uses createEnhancedMcpHttpServer
│   └── tools.ts       # Tools only - prompts/resources loaded dynamically
```

### Key Benefits of New Pattern

1. **Single Source of Truth**: Database contains all prompts/resources
2. **Zero Configuration Drift**: No hardcoded configs across servers
3. **Hot Reloading**: Changes take effect without server restarts
4. **Multi-tenant Ready**: Organization-specific customization
5. **Version Control**: Full audit trail and rollback capability
6. **Admin UI**: Web interface for managing prompts/resources

### Integration with Enhanced Server Core

All MCP servers now use `createEnhancedMcpHttpServer` from `@mcp/server-core`:

```typescript
// apps/[domain]-mcp-server/src/mcp-server/http-server.ts
import { createEnhancedMcpHttpServer } from "@mcp/server-core";
import { toolHandlers } from "./tools";

const server = createEnhancedMcpHttpServer({
  serverName: "domain-server",
  handlers: {
    tools: toolHandlers,
    // Prompts and resources loaded dynamically from database
    // via DefaultDynamicHandlerRegistry
  },
});
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

- **Server Structure**: All directories and files following the DATABASE-DRIVEN pattern
- **Enhanced HTTP Server**: Uses `createEnhancedMcpHttpServer` with dynamic handlers
- **Template Handlers**: Placeholder API handlers with proper error handling
- **Input Schemas**: Centralized schemas in `@mcp/schemas/input-schemas/[domain].ts`
- **Capabilities Registration**: Auto-registration in `@mcp/capabilities`
- **Configuration**: Environment variables, TypeScript config, and dependency setup
- **Validation**: Builds successfully and passes startup tests
- **Database Integration**: Automatic prompts/resources loading from database

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

Use the enhanced server pattern:

```typescript
import { createEnhancedMcpHttpServer } from "@mcp/server-core";
import { toolHandlers } from "./tools";

export const server = createEnhancedMcpHttpServer({
  serverName: "github-server",
  handlers: {
    tools: toolHandlers,
    // Prompts and resources are loaded dynamically from database
  },
});
```

#### 4. Update Validation Schemas (`src/schemas/domain-schemas.ts`)

Customize Zod schemas for your domain's validation needs:

```typescript
export const SearchReposRequestSchema = z.object({
  query: z.string().describe("Search query for repositories"),
  language: z.string().optional().describe("Filter by programming language"),
  sort: z.enum(["stars", "forks", "updated"]).optional(),
});
```

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
├── linear.ts          # Linear-specific schemas
├── github.ts          # GitHub-specific schemas (auto-generated)
├── slack.ts           # Slack-specific schemas (future)
├── notion.ts          # Notion-specific schemas (future)
└── index.ts           # Exports everything (auto-updated)
```

### Benefits of Automated Scaffolding

1. **Speed**: Create a working server in seconds, not hours
2. **Consistency**: All servers follow identical DATABASE-DRIVEN patterns
3. **Validation**: Generated servers build and start successfully
4. **Integration**: Automatic registration with gateway and capabilities
5. **Best Practices**: Templates include database integration and dynamic loading

## Benefits of Database-Driven Pattern

1. **Consistency**: All servers follow the same dynamic structure
2. **Type Safety**: Centralized schemas ensure type safety
3. **Reusability**: Common patterns are shared via `@mcp/server-core`
4. **Maintainability**: Clear separation of concerns
5. **Scalability**: Database caching and multi-tenant support
6. **Hot Reloading**: Changes take effect without deployment
7. **Admin UI**: User-friendly management interface

## Best Practices

1. **Use Enhanced HTTP Server**: Always use `createEnhancedMcpHttpServer`
2. **No Static Config**: Never create static prompts.ts or resources.ts files
3. **Database Integration**: Leverage the dynamic handler registry
4. **Organization Context**: Handle multi-tenant scenarios gracefully
5. **Version Control**: Use database versioning for prompts/resources
6. **Admin UI First**: Manage prompts/resources through the web interface
7. **Follow Tool Patterns**: Keep domain-specific code in domain files
8. **Centralized Schemas**: Use `@mcp/schemas` for input validation

## Examples

Current servers using the DATABASE-DRIVEN pattern:

- **✅ Linear Server**: Issues, Teams, Users, Projects + Dynamic Prompts/Resources
- **✅ Perplexity Server**: Search, Research, Compare + Dynamic Prompts/Resources
- **✅ DevTools Server**: Chrome automation + Dynamic Prompts/Resources

Future servers will follow the same pattern:

- **GitHub Server**: Repos, Issues, Pull Requests, Actions + Dynamic Config
- **Slack Server**: Messages, Channels, Users, Workspaces + Dynamic Config
- **Notion Server**: Pages, Databases, Blocks, Users + Dynamic Config

## Migration Guide

If you have existing servers with static prompts/resources files:

### 1. Remove Static Files

```bash
# Remove these files
rm src/mcp-server/prompts.ts
rm src/mcp-server/resources.ts
```

### 2. Update HTTP Server

```typescript
// Replace with enhanced server
import { createEnhancedMcpHttpServer } from "@mcp/server-core";
```

### 3. Migrate Data to Database

```bash
# Add your prompts/resources to seed script
vim packages/database/prisma/seed-prompts-resources.ts
```

### 4. Test Dynamic Loading

```bash
# Verify prompts/resources load from database
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-api-key-12345" \
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list","params":{}}' \
  http://localhost:37373/mcp
```

**The database-driven pattern is now the standard for all MCP servers!** 🎉
