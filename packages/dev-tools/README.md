# 🔧 Omni MCP Development Tools

Official CLI for testing and developing with the Omni MCP architecture.

## Installation

The CLI is automatically available in the workspace:

```bash
# Install dependencies
pnpm install

# Use the CLI
pnpm omni-mcp --help
```

## Commands

### 🌐 Test Gateway

```bash
# Test all gateway endpoints
pnpm omni-mcp test-gateway

# Test specific endpoints
pnpm omni-mcp test-gateway --tools
pnpm omni-mcp test-gateway --resources
pnpm omni-mcp test-gateway --prompts

# Interactive testing
pnpm omni-mcp test-gateway --interactive

# Call a specific tool
pnpm omni-mcp test-gateway --call linear_get_teams --args '{"limit": 5}'
```

### 🔧 Test Individual Servers

```bash
# Test Linear server directly
pnpm omni-mcp test-server linear

# Test with custom port
pnpm omni-mcp test-server linear --port 3001
```

### 🏥 Health Checks

```bash
# Check all services
pnpm omni-mcp health --all

# Check gateway only
pnpm omni-mcp health --gateway

# Check servers only
pnpm omni-mcp health --servers
```

### 📋 List Capabilities

```bash
# List all available tools, resources, and prompts
pnpm omni-mcp list

# List specific types
pnpm omni-mcp list --tools
pnpm omni-mcp list --resources
pnpm omni-mcp list --prompts
```

### 🔧 Call Tools Directly

```bash
# Call a tool with arguments
pnpm omni-mcp call linear_get_teams --args '{"limit": 10}'

# Call with empty arguments
pnpm omni-mcp call linear_get_users
```

### 🎯 Interactive Mode

```bash
# Start interactive testing session
pnpm omni-mcp interactive
```

## Common Workflows

### Development Testing

1. **Check everything is running**: `pnpm omni-mcp health --all`
2. **See what's available**: `pnpm omni-mcp list --tools`
3. **Test a specific tool**: `pnpm omni-mcp call <tool-name>`

### Gateway Validation

1. **Test tool discovery**: `pnpm omni-mcp test-gateway --tools`
2. **Interactive testing**: `pnpm omni-mcp test-gateway --interactive`

### Server Development

1. **Test server directly**: `pnpm omni-mcp test-server linear`
2. **Test via gateway**: `pnpm omni-mcp test-gateway --call linear_get_teams`

## Why Use This CLI?

### ✅ **JSON-RPC ID Management**

The CLI automatically handles the required `id` field in JSON-RPC requests:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1 // ← Automatically generated and managed
}
```

### ✅ **MCP Protocol Compliance**

- Proper JSON-RPC 2.0 format
- Correct error handling
- Request/response correlation

### ✅ **Developer Experience**

- Pretty-printed responses
- Clear error messages
- Interactive testing modes
- Comprehensive help

### ✅ **Testing Automation**

- Scriptable commands
- CI/CD integration
- Health monitoring

## Architecture Support

This CLI supports the complete Omni MCP architecture:

- **Gateway Testing**: Validate the MCP gateway aggregation
- **Server Testing**: Test individual MCP servers directly
- **End-to-End**: Full client → gateway → server workflows
- **Protocol Validation**: Ensure JSON-RPC 2.0 + MCP compliance

## Examples

### Quick Health Check

```bash
pnpm omni-mcp health --all
```

### Discover Available Tools

```bash
pnpm omni-mcp list --tools
```

### Test Linear Integration

```bash
pnpm omni-mcp call linear_get_teams --args '{"limit": 5}'
```

### Interactive Development

```bash
pnpm omni-mcp interactive
```

---

**Need help?** Run `pnpm omni-mcp --help` for detailed usage information.
