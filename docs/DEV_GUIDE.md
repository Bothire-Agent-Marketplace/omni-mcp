# Development Guide

## Quick Start

### 🚀 Start Development Environment

```bash
# Start all services (recommended)
pnpm dev

# Start after cleaning up hanging processes
pnpm dev:clean

# Start without ngrok webhook
pnpm dev:no-webhook

# Start without Prisma Studio
pnpm dev:no-studio

# Start only the servers (no studio, no ngrok)
pnpm dev:servers-only
```

### 🛑 Stop Development Environment

**New improved method:**

- Press `Ctrl+C` once - all services will shut down gracefully

**If services don't stop properly:**

```bash
# Clean up hanging processes and free ports
pnpm cleanup
```

## What Runs When You Start Dev

| Service              | Port    | Description                                             |
| -------------------- | ------- | ------------------------------------------------------- |
| 🚀 **MCP Servers**   | Various | All MCP servers (gateway, linear, perplexity, devtools) |
| 📊 **Prisma Studio** | 5555    | Database GUI at http://localhost:5555                   |
| 🌐 **Ngrok**         | -       | Webhook tunnel for external services                    |
| 🎨 **MCP Admin UI**  | 3000    | Admin interface at http://localhost:3000                |

## Development Scripts

### Core Development

- `pnpm dev` - **Main development command** (includes all services)
- `pnpm dev:clean` - Clean up ports first, then start dev
- `pnpm cleanup` - Kill hanging processes and free up ports

### Alternative Dev Modes

- `pnpm dev:legacy` - Use old concurrently-based approach
- `pnpm dev:no-webhook` - Skip ngrok tunnel
- `pnpm dev:no-studio` - Skip Prisma Studio
- `pnpm dev:servers-only` - Only MCP servers, no extras

### Database Management

- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:seed:prompts` - Seed prompts and resources
- `pnpm db:reset` - Reset database (destructive)

### Specific Services

- `pnpm dev:gateway` - Only run the gateway
- `pnpm dev:all-servers` - Only run MCP servers
- `pnpm arc` - Start Chrome with debugging
- `pnpm arc:connect` - Connect to existing Chrome instance

## MCP Gateway Usage & Testing

### 🌐 Gateway Overview

The MCP Gateway runs on `http://localhost:37373` and aggregates all MCP servers:

- **Linear Server** (3001): Linear API integration
- **Perplexity Server** (3002): AI search and research
- **DevTools Server** (3003): Browser automation and debugging

### 🔍 Health Check & Discovery

```bash
# Check overall system health
curl http://localhost:37373/health

# Discover all available tools across servers
curl http://localhost:37373/tools/list | jq

# Discover all available prompts
curl http://localhost:37373/prompts/list | jq

# Discover all available resources
curl http://localhost:37373/resources/list | jq
```

### 🚀 Example Requests

#### **1. Basic Tool Execution (No Organization Context)**

```bash
# Execute Linear search without org context (uses defaults)
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp_gateway_linear_search_issues",
    "arguments": {
      "query": "bug reports",
      "limit": 5
    }
  }' | jq

# Execute Perplexity search
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp_gateway_perplexity_search",
    "arguments": {
      "query": "latest AI developments 2025",
      "model": "sonar"
    }
  }' | jq

# Execute DevTools browser action
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp_gateway_chrome_navigate",
    "arguments": {
      "url": "https://example.com"
    }
  }' | jq
```

#### **2. With Organization Context (Multi-tenant)**

```bash
# Set your organization context headers
ORG_ID="org_12345"
CLERK_ORG_ID="org_2mK3nL4pQ5rS6tU7v"

# Execute tool with organization context
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -H "x-organization-id: $ORG_ID" \
  -H "x-organization-clerk-id: $CLERK_ORG_ID" \
  -d '{
    "name": "mcp_gateway_linear_search_issues",
    "arguments": {
      "query": "feature requests",
      "limit": 10
    }
  }' | jq

# Get organization-specific prompts
curl http://localhost:37373/prompts/list \
  -H "x-organization-id: $ORG_ID" \
  -H "x-organization-clerk-id: $CLERK_ORG_ID" | jq

# Get organization-specific resources
curl http://localhost:37373/resources/list \
  -H "x-organization-id: $ORG_ID" \
  -H "x-organization-clerk-id: $CLERK_ORG_ID" | jq
```

#### **3. Prompt Template Usage**

```bash
# Get a specific prompt (uses organization context if provided)
curl -X POST http://localhost:37373/prompts/get \
  -H "Content-Type: application/json" \
  -H "x-organization-id: $ORG_ID" \
  -d '{
    "name": "linear_issue_analysis"
  }' | jq

# The response will include the processed template:
# {
#   "content": [
#     {
#       "type": "text",
#       "text": "Analyze this Linear issue and provide insights..."
#     }
#   ],
#   "name": "linear_issue_analysis",
#   "description": "Analyzes Linear issues for patterns and insights",
#   "arguments": {
#     "type": "object",
#     "properties": {
#       "issue_id": { "type": "string", "description": "Linear issue ID" }
#     }
#   }
# }
```

#### **4. Resource Access**

```bash
# Get a specific resource
curl -X POST http://localhost:37373/resources/read \
  -H "Content-Type: application/json" \
  -H "x-organization-id: $ORG_ID" \
  -d '{
    "uri": "linear://teams"
  }' | jq

# Resource response includes actual data:
# {
#   "contents": [
#     {
#       "uri": "linear://teams",
#       "mimeType": "application/json",
#       "text": "[{\"id\": \"team_123\", \"name\": \"Engineering\", \"key\": \"ENG\"}]"
#     }
#   ]
# }
```

### 🔐 Authentication Examples

#### **JWT Token Authentication**

```bash
# Using Clerk JWT token (extracted from session)
JWT_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "mcp_gateway_linear_get_teams",
    "arguments": {}
  }' | jq
```

#### **API Key Authentication**

```bash
# Using organization API key
API_KEY="omni_org_api_key_12345abcdef"

curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "mcp_gateway_perplexity_search",
    "arguments": {
      "query": "market analysis Q4 2024"
    }
  }' | jq
```

### 🧪 Testing Different Organization Contexts

```bash
# Test with different organizations to see different prompts/resources
ORG_A="org_engineering_team"
ORG_B="org_marketing_team"

# Engineering team prompts (might include technical analysis prompts)
curl http://localhost:37373/prompts/list \
  -H "x-organization-id: $ORG_A" | jq '.prompts[].name'

# Marketing team prompts (might include content creation prompts)
curl http://localhost:37373/prompts/list \
  -H "x-organization-id: $ORG_B" | jq '.prompts[].name'
```

### 📊 Debugging & Monitoring

#### **Server-Specific Endpoints**

```bash
# Test individual servers directly
curl http://localhost:3001/health  # Linear server
curl http://localhost:3002/health  # Perplexity server
curl http://localhost:3003/health  # DevTools server

# Get capabilities from specific servers
curl http://localhost:3001/tools/list | jq '.tools[].name'
curl http://localhost:3002/prompts/list | jq '.prompts[].name'
curl http://localhost:3003/resources/list | jq '.resources[].uri'
```

#### **Error Handling Examples**

```bash
# Invalid tool name
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invalid_tool_name",
    "arguments": {}
  }' | jq

# Missing required arguments
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mcp_gateway_linear_search_issues",
    "arguments": {}
  }' | jq

# Invalid organization context
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -H "x-organization-id: invalid_org_id" \
  -d '{
    "name": "mcp_gateway_linear_get_teams",
    "arguments": {}
  }' | jq
```

### 🔍 Advanced Testing Scenarios

#### **Load Testing**

```bash
# Test concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:37373/tools/call \
    -H "Content-Type: application/json" \
    -d '{
      "name": "mcp_gateway_perplexity_search",
      "arguments": {"query": "test query '$i'"}
    }' &
done
wait
```

#### **Organization Context Propagation Testing**

```bash
# Verify organization context reaches the servers
curl -X POST http://localhost:37373/tools/call \
  -H "Content-Type: application/json" \
  -H "x-organization-id: test_org_123" \
  -H "x-debug: true" \
  -d '{
    "name": "mcp_gateway_linear_get_teams",
    "arguments": {}
  }' | jq
```

### 📝 Common Response Formats

#### **Successful Tool Response**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Tool execution result data here..."
    }
  ],
  "isError": false
}
```

#### **Error Response**

```json
{
  "error": {
    "code": -1,
    "message": "Tool not found: invalid_tool_name"
  },
  "isError": true
}
```

#### **Prompt Response**

```json
{
  "prompts": [
    {
      "name": "linear_issue_analysis",
      "description": "Analyzes Linear issues for patterns",
      "arguments": {
        "type": "object",
        "properties": {
          "issue_id": { "type": "string" }
        },
        "required": ["issue_id"]
      }
    }
  ]
}
```

## Troubleshooting

### 🔧 Port Issues

If you get "port already in use" errors:

```bash
pnpm cleanup
```

### 🔄 Terminal Stuck/Scrolling Issues

The new dev script fixes most terminal issues, but if you experience problems:

1. Use `pnpm dev:legacy` (old behavior)
2. Or run services individually:

   ```bash
   # Terminal 1
   pnpm dev:servers-only

   # Terminal 2
   pnpm db:studio

   # Terminal 3
   pnpm ngrok:start
   ```

### 🐛 Service Won't Start

1. Check if ports are free: `pnpm cleanup`
2. Check database connection: `pnpm db:studio`
3. Check individual service logs by running them separately

### 📊 Prisma Studio Not Loading

1. Ensure database is running
2. Check if port 5555 is free: `lsof -i :5555`
3. Try running separately: `pnpm db:studio`

## Development Workflow

1. **Start environment**: `pnpm dev`
2. **Make changes** to code (auto-reload enabled)
3. **Access services**:
   - Admin UI: http://localhost:3000
   - Prisma Studio: http://localhost:5555
   - Gateway: http://localhost:37373
4. **Stop environment**: `Ctrl+C` (graceful shutdown)

## Tips

- **Prisma Studio** is now automatically started with dev environment
- **Graceful shutdown** properly cleans up all processes
- **Colored output** makes it easier to distinguish between services
- **Use `pnpm dev:clean`** if you suspect hanging processes
- **Individual service commands** available for debugging specific issues

## Port Map

| Service           | Port  | URL                    |
| ----------------- | ----- | ---------------------- |
| MCP Admin UI      | 3000  | http://localhost:3000  |
| Gateway           | 37373 | http://localhost:37373 |
| Linear Server     | 3001  | http://localhost:3001  |
| Perplexity Server | 3002  | http://localhost:3002  |
| DevTools Server   | 3003  | http://localhost:3003  |
| Prisma Studio     | 5555  | http://localhost:5555  |

## 🗄️ Database Development Workflow

### **When Users/Data Changes Frequently**

```bash
# Smart reset (preserves users/orgs, resets everything else)
pnpm db:reset

# Full reset (nuclear option)
pnpm db:reset:force

# After schema changes
pnpm db:migrate
pnpm db:seed:prompts  # Re-seed prompts/resources only
```

### **Clerk Webhook Issues**

If you see P2002 unique constraint errors:

```bash
# Quick fix: Reset database
pnpm db:reset

# Or check webhook logs
curl http://localhost:3000/api/health
```

**Pro Tip**: The `smart-reset` preserves your Clerk users and organizations while resetting prompts,
resources, and other data. Perfect for development!
