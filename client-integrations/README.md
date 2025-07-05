# MCP Client Integrations

This directory contains a centralized bridge system for connecting various MCP clients (Cursor,
Claude Desktop, etc.) to the MCP Gateway.

## Architecture

```
MCP Client (stdio) ↔ Bridge Launcher ↔ Bridge Core ↔ MCP Gateway (HTTP/SSE)
```

### Components

- **`shared/`** - Common bridge logic and configuration
  - `mcp-bridge-core.js` - Core bridge implementation
  - `config.js` - Shared configuration utilities
- **`cursor/`** - Cursor IDE specific integration

## Quick Start

### Prerequisites

1. MCP Gateway running on `http://localhost:37373`
2. Node.js installed
3. Required npm packages: `eventsource`

### Install Dependencies

```bash
# From project root (uses pnpm workspace)
pnpm install
```

### Cursor IDE Setup

1. **Configure Cursor MCP settings** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "gateway": {
      "command": "node",
      "args": ["/path/to/omni-mcp/client-integrations/cursor/bridge.js", "http://localhost:37373"]
    }
  }
}
```

2. **Restart Cursor** to load the new configuration

### Client-Specific Configuration

Each client has its own `config.json` file with client-specific settings:

- **Cursor**: Optimized for quick responses, no request buffering

## Testing

Test the bridge directly:

````bash
# Test Cursor bridge
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | \
  node client-integrations/cursor/bridge.js http://localhost:37373


## Development

### Adding a New Client

1. Create a new directory: `client-integrations/new-client/`
2. Create `bridge.js` launcher:
```javascript
#!/usr/bin/env node
const MCPBridgeCore = require('../shared/mcp-bridge-core');
const config = require('../shared/config');

async function main() {
  const gatewayUrl = process.argv[2] || 'http://localhost:37373';
  const clientConfig = config.getClientConfig('new-client', {
    // Client-specific overrides
  });

  const bridge = new MCPBridgeCore(gatewayUrl, clientConfig);
  await bridge.start();
}

main();
````

3. Create `config.json` with client-specific settings
4. Update client's MCP configuration to use the new bridge

### Debugging

Enable debug logging:

```bash
MCP_BRIDGE_DEBUG=true node client-integrations/cursor/bridge.js
```

## Troubleshooting

### Common Issues

1. **"ECONNREFUSED" errors**
   - Ensure MCP Gateway is running on the specified port
   - Check gateway URL in configuration

2. **"Module not found" errors**
   - Install required dependencies: `pnpm install`
   - Verify file paths in MCP configuration

3. **Bridge hangs or times out**
   - Check gateway health: `curl http://localhost:37373/health`
   - Verify SSE endpoint: `curl http://localhost:37373/sse`

### Logs

Bridge logs are written to stderr and include:

- Connection status
- Request/response flow
- Error messages
- Performance metrics

## Security

- Bridges run locally and connect to localhost gateway by default
- No authentication required for local development
- For production deployments, consider:
  - API key authentication
  - HTTPS/WSS connections
  - Rate limiting
  - Input validation

## Performance

- Bridges use HTTP/SSE for efficient real-time communication
- Request buffering available for clients that need it
- Graceful shutdown ensures no data loss
- Configurable timeouts and retry logic

## TODO

- Add claude config when it supports sse/http

{ "mcpServers": { "my-http-server": { "type": "http", "url": "http://localhost:PORT" },
"my-sse-server": { "type": "sse", "url": "http://localhost:PORT/sse" } } }
