# MCP Server Pattern Documentation

## Overview

This document describes the standardized pattern for creating MCP servers in this monorepo.

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

### Quick Start with Scaffolding Tool

Use the automated scaffolding tool to create a new MCP server:

```bash
# Create a new MCP server (e.g., GitHub)
node scripts/scaffold-mcp-server.js add github

# The tool will automatically:
# 1. Create the server directory structure
# 2. Generate all template files
# 3. Create input schemas in @mcp/schemas
# 4. Register with @mcp/capabilities
# 5. Update configuration files
# 6. Install dependencies
# 7. Build and validate the server
```

### What Gets Generated

The scaffolding tool creates a complete, working MCP server with:

- **Server Structure**: All directories and files following the standard pattern
- **Template Handlers**: Placeholder API handlers with proper error handling
- **Input Schemas**: Centralized schemas in `@mcp/schemas/input-schemas/[domain].ts`
- **Capabilities Registration**: Auto-registration in `@mcp/capabilities`
- **Configuration**: Environment variables, TypeScript config, and dependency setup
- **Validation**: Builds successfully and passes startup tests

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

#### 3. Update Validation Schemas (`src/schemas/domain-schemas.ts`)

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
2. **Consistency**: All servers follow identical patterns
3. **Validation**: Generated servers build and start successfully
4. **Integration**: Automatic registration with gateway and capabilities
5. **Best Practices**: Templates include proper error handling and validation

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
