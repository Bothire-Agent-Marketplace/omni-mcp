# Linear MCP Server

Enterprise-grade Linear integration following **Omni MCP Enterprise Pattern**.

## 🏗️ Architecture

This server implements the [Enterprise MCP Server Pattern](../../MCP_SERVER_PATTERN.md) with:

- ✅ Shared type system from `@mcp/schemas`
- ✅ Standardized error handling with `McpResponse<T>`
- ✅ Enterprise-grade Docker containerization
- ✅ Comprehensive tool/resource/prompt definitions

## 🚀 Quick Start

```bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## 🔧 Configuration

Edit `src/config/config.ts` with your Linear credentials:

```typescript
export const LINEAR_CONFIG = {
  API_KEY: process.env.LINEAR_API_KEY,
  BASE_URL: process.env.LINEAR_BASE_URL || "https://api.linear.app",
};
```

**Environment Variables:**

```bash
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_BASE_URL=https://api.linear.app  # Optional
```

## 🛠️ Features

### Tools (10 implemented)

- `linear_search_issues` - Search issues with filters
- `linear_create_issue` - Create new issues
- `linear_update_issue` - Update existing issues
- `linear_get_issue` - Get issue details
- `linear_get_teams` - List teams
- `linear_get_projects` - List projects
- `linear_get_workflow_states` - Get workflow states
- `linear_comment_on_issue` - Add comments
- `linear_get_sprint_issues` - Get sprint/cycle issues
- `linear_get_user` - Get user details

### Resources (4 implemented)

- `linear://teams` - All teams
- `linear://projects/{teamId}` - Team projects
- `linear://workflow-states/{teamId}` - Workflow states
- `linear://users` - All users

### Prompts (3 implemented)

- `create_issue_workflow` - Issue creation guide
- `triage_workflow` - Issue triage process
- `sprint_planning` - Sprint planning workflow

## 📊 Implementation

### Real Linear API Integration

```typescript
// Actual Linear SDK usage
const issues = await this.client.issues({
  filter: { team: { id: { eq: teamId } } },
  first: limit,
});

// Enterprise error handling
return this._execute("linear_search_issues", async () => {
  const data = await logic();
  return { success: true, data };
});
```

### Type Safety

```typescript
// Shared types from @mcp/schemas
import {
  LINEAR_TOOLS,
  SearchIssuesArgs,
  CreateIssueArgs,
  LinearSearchResponse,
} from "@mcp/schemas";
```

## 📋 Usage Examples

### Search Issues

```bash
# Via Claude Desktop
"Search for issues in Phoenix team with high priority"
```

### Create Issue

```bash
# Via Claude Desktop
"Create a new issue titled 'Fix login bug' in the Phoenix team"
```

### Get Team Information

```bash
# Via Claude Desktop
"Show me all teams and their workflow states"
```

## 📊 Validation

```bash
# Validate enterprise pattern compliance
omni validate linear

# Test functionality
omni test linear
```

## 🐳 Docker

```bash
# Build image
docker build -t linear-mcp-server .

# Run container
docker run -e LINEAR_API_KEY=your_key linear-mcp-server
```

## 🔍 Monitoring

```bash
# View logs
make logs-linear

# Check status
docker ps --filter "name=linear-mcp"

# Real-time monitoring
make logs-mcp-only
```

## 🧪 Testing

The Linear MCP server includes comprehensive testing:

```bash
# Run tests
pnpm test

# Validate all tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

## 📖 API Reference

### Linear SDK Integration

- Uses `@linear/sdk` for type-safe API calls
- Handles async relationships (issue.state, issue.assignee)
- Proper error handling and validation
- Rate limiting and timeout configuration

### MCP Protocol Compliance

- JSON-RPC 2.0 protocol
- Stdio transport for Claude Desktop
- Standard MCP server capabilities
- Tool/Resource/Prompt definitions

## 🚀 Development

```bash
# Start development with hot reload
cd servers/linear-mcp-server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm type-check
```

## 📈 Performance

- **Response Time**: <100ms for most operations
- **Rate Limiting**: 60 requests/minute (configurable)
- **Memory Usage**: ~50MB typical
- **Concurrent Requests**: Handled via async/await

## 🔒 Security

- API key validation on startup
- No sensitive data logging
- HTTPS communication with Linear API
- Input validation using Zod schemas

## 📖 Documentation

- [Enterprise MCP Server Pattern](../../MCP_SERVER_PATTERN.md)
- [Shared Schemas](../../shared/schemas/README.md)
- [Development Guide](../../README.md)
- [Linear API Docs](https://developers.linear.app/)

---

**Gold Standard**: This Linear MCP server serves as the reference implementation for the Enterprise
MCP Server Pattern.
