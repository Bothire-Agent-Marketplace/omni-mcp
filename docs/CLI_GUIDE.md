# 🚀 Omni MCP CLI Guide

Enterprise-grade CLI tool for managing MCP (Model Context Protocol) servers at scale.

## 🏗️ Overview

The Omni MCP CLI provides powerful commands to create, manage, and validate MCP servers following the **Enterprise MCP Server Pattern**. It ensures consistency, type safety, and best practices across all MCP servers in your organization.

## 📥 Installation

The CLI is built into the Omni project and accessible via both direct commands and Makefile shortcuts.

```bash
# Build the CLI (first time setup)
cd packages/dev-tools
pnpm build

# Or use Makefile commands (recommended)
make list-mcp
```

## 🛠️ Commands

### 🏗️ Create MCP Server

Generate a new enterprise-grade MCP server with full scaffolding.

```bash
# Direct CLI usage
node packages/dev-tools/dist/cli/index.js create <service-name>

# Makefile shortcut
make create-mcp SERVICE=github
make create-mcp SERVICE=slack
make create-mcp SERVICE=jira
```

**Features:**

- ✅ Full Enterprise MCP Server Pattern compliance
- ✅ Server-specific type system
- ✅ Docker containerization ready
- ✅ TypeScript configuration
- ✅ Tool/Resource/Prompt structure
- ✅ Hierarchical environment configuration
- ✅ README documentation

**Example:**

```bash
make create-mcp SERVICE=github
```

Creates:

```
servers/github-mcp-server/
├── src/
│   ├── index.ts
│   ├── config/config.ts
│   ├── types/
│   │   ├── mcp-types.ts
│   │   └── github-types.ts
│   └── mcp-server/
│       ├── server.ts
│       ├── tools.ts
│       ├── resources.ts
│       ├── prompts.ts
│       └── tools/github-tools.ts
├── .env.example
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

### 📋 List MCP Servers

View all MCP servers in the project with detailed information.

```bash
# Basic list
make list-mcp
node packages/dev-tools/dist/cli/index.js list

# Detailed information
make list-mcp-verbose
node packages/dev-tools/dist/cli/index.js list --verbose
```

**Verbose Output Shows:**

- 📦 Package version and description
- 🔨 Build status (TypeScript compilation)
- 🐳 Docker configuration status
- 📋 Shared schemas status
- 🛠️ Number of implemented tools
- ✅ Enterprise Pattern compliance
- 📂 File system path

### 🔍 Validate MCP Servers

Comprehensive validation against Enterprise MCP Server Pattern.

```bash
# Validate all servers
make validate-mcp
node packages/dev-tools/dist/cli/index.js validate

# Validate specific server
make validate-mcp SERVICE=linear
node packages/dev-tools/dist/cli/index.js validate linear

# Auto-fix issues (where possible)
node packages/dev-tools/dist/cli/index.js validate --fix
```

**Validation Checks:**

- 📁 **Directory Structure**: Required files and folders
- 📊 **Server-Specific Types**: Proper type definitions in server's `types/` directory
- 🏗️ **Enterprise Patterns**: \_execute wrapper, McpResponse usage
- 🔧 **Environment Config**: Hierarchical environment variable loading
- 🐳 **Docker**: Containerization setup

**Scoring System:**

- 🟢 90%+ = Excellent
- 🟡 70-89% = Good
- 🔴 <70% = Needs improvement

### 🗑️ Remove MCP Server

Safely remove MCP servers from the project.

```bash
# Interactive removal (shows what will be deleted)
node packages/dev-tools/dist/cli/index.js remove github

# Force removal (Makefile default)
make remove-mcp SERVICE=github
node packages/dev-tools/dist/cli/index.js remove github --force

# Keep shared schemas
node packages/dev-tools/dist/cli/index.js remove github --force --keep-schemas
```

**Cleanup Actions:**

- 🗂️ Removes server directory
- 📝 Cleans up any references in shared configuration
- 🐳 Warns about Docker configuration cleanup

### 🚀 Development Commands

Start development environment for specific servers.

```bash
# Start development environment
node packages/dev-tools/dist/cli/index.js dev github

# Test server functionality
node packages/dev-tools/dist/cli/index.js test github
```

### 🔧 Advanced CLI Access

Access the full CLI with custom arguments.

```bash
# Makefile passthrough
make omni-cli ARGS="create slack --template advanced"
make omni-cli ARGS="validate --fix"

# Direct access
node packages/dev-tools/dist/cli/index.js <command> [options]
```

## 🏆 Enterprise MCP Server Pattern

All generated servers follow the **Enterprise MCP Server Pattern**:

### ✅ Mandatory Requirements

1. **Server-Specific Type System**

   ```typescript
   // ❌ Anti-pattern - Hardcoded types
   const TOOLS = [{ name: "github_search", description: "Search GitHub" }];

   // ✅ Enterprise pattern - Server-specific types
   import { GITHUB_TOOLS } from "../types/mcp-types.js";
   export const TOOLS = GITHUB_TOOLS;
   ```

2. **Standardized Error Handling**

   ```typescript
   // ✅ All tools must use _execute wrapper
   private async _execute<T>(toolName: string, logic: () => Promise<T>): Promise<McpResponse<T>>
   ```

3. **McpResponse Pattern**
   ```typescript
   // ✅ Consistent response format
   return { success: true, data: result };
   return { success: false, error: "Error message" };
   ```

### 📂 Standard Directory Structure

```
service-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/config.ts      # Environment configuration
│   ├── types/
│   │   ├── mcp-types.ts      # Server-specific MCP definitions
│   │   └── service-types.ts  # Domain-specific types
│   └── mcp-server/
│       ├── server.ts         # MCP server setup
│       ├── tools.ts          # MCP tool definitions (what tools exist)
│       ├── resources.ts      # MCP resource definitions
│       ├── prompts.ts        # MCP prompt definitions
│       └── tools/
│           └── service-tools.ts  # Tool implementation classes (how tools work)
├── package.json              # Package configuration
├── tsconfig.json            # TypeScript configuration
├── Dockerfile               # Multi-stage Docker build
└── README.md                # Documentation
```

## 📊 Integration Examples

### Workflow: Creating a New MCP Server

```bash
# 1. Create server
make create-mcp SERVICE=slack

# 2. Configure credentials
cd servers/slack-mcp-server
# Edit src/config/config.ts with Slack API credentials

# 3. Implement tools
# Edit src/mcp-server/tools/slack-tools.ts
# Edit src/types/mcp-types.ts and src/types/slack-types.ts

# 4. Build and validate
pnpm build
make validate-mcp SERVICE=slack

# 5. Test functionality
make omni-cli ARGS="dev slack"
```

### Multi-Server Management

```bash
# Create multiple servers
make create-mcp SERVICE=github
make create-mcp SERVICE=jira
make create-mcp SERVICE=notion

# Validate all servers
make validate-mcp

# List all servers with details
make list-mcp-verbose
```

### Claude Desktop Integration

```bash
# After creating servers, update Claude config
make claude-config-dev  # Use local servers
make claude-watch       # Auto-sync config changes
```

## 🚀 Advanced Features

### Template Options (Future)

```bash
# Different template types (planned)
make omni-cli ARGS="create github --template advanced"
make omni-cli ARGS="create slack --template minimal"
```

### Batch Operations (Future)

```bash
# Bulk validation with fixes
make omni-cli ARGS="validate --fix --all"

# Bulk updates
make omni-cli ARGS="update-schema --all"
```

## 🛡️ Best Practices

### 1. **Always Validate Before Deployment**

```bash
make validate-mcp SERVICE=myservice
# Ensure 90%+ compliance score
```

### 2. **Use Server-Specific Types**

```typescript
// ❌ Don't hardcode types
const TOOLS = [{ name: "my_tool", ... }];

// ✅ Use server-specific type definitions
import { MYSERVICE_TOOLS } from "../types/mcp-types.js";
```

### 3. **Follow Naming Conventions**

- Service names: lowercase, hyphenated (`my-service`)
- Tool names: service prefix (`myservice_action`)
- Classes: PascalCase (`MyServiceTools`)

### 4. **Implement All Three MCP Capabilities**

- ✅ Tools (actions/functions)
- ✅ Resources (read-only data)
- ✅ Prompts (AI interaction templates)

## 🐛 Troubleshooting

### CLI Not Found

```bash
# Rebuild the CLI
cd packages/dev-tools && pnpm build
```

### Validation Errors

```bash
# Check specific issues
make validate-mcp SERVICE=myservice

# Common fixes:
# - Add missing README.md
# - Import shared types
# - Use _execute wrapper
# - Add McpResponse types
```

### Type Errors

```bash
# Rebuild server
cd servers/myservice-mcp-server && pnpm build

# Update server dependencies
cd servers/myservice-mcp-server && pnpm install
```

## 📈 Migration Guide

### Existing MCP Servers → Enterprise Pattern

1. **Create server-specific types directory**
2. **Move type definitions to server's `types/` directory**
3. **Add \_execute wrapper to tools**
4. **Use McpResponse<T> return types**
5. **Implement hierarchical environment loading**
6. **Validate compliance**

```bash
# Migration validation
make validate-mcp SERVICE=existing-server
# Fix issues shown in validation report
```

## 🔗 Related Documentation

- [Enterprise MCP Server Pattern](MCP_SERVER_PATTERN.md)
- [Shared Schemas Guide](shared/schemas/README.md)
- [Development Guide](README.md)
- [Docker Guide](deployment/README.md)

---

🎯 **Goal**: Enable teams to rapidly create, manage, and scale 100+ enterprise-grade MCP servers with consistent patterns and zero technical debt.
