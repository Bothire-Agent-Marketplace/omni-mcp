# @mcp/client-bridge

A TypeScript library for easily connecting MCP clients (Cursor, Claude Desktop) to local and remote
MCP servers using `mcp-remote`.

## Features

- 🔧 **Type-safe configuration** - Full TypeScript support with Zod validation
- 🌉 **Unified bridge system** - Uses `mcp-remote` under the hood for reliable connections
- 🎯 **Multi-client support** - Generate configs for Cursor IDE and Claude Desktop
- 🌍 **Environment management** - Different configurations for dev/staging/production
- 🔌 **Easy deployment** - Automatically deploy configs to client directories
- 🧪 **Testing utilities** - Validate configurations and test connections
- 📱 **CLI included** - Command-line interface for common operations

## Quick Start

### Installation

```bash
# In your monorepo
pnpm add @mcp/client-bridge

# Or install mcp-remote globally
pnpm add -g mcp-remote
```

### Basic Usage

```typescript
import { ConfigManager } from "@mcp/client-bridge";

// Create a configuration manager
const manager = ConfigManager.fromServers({
  gateway: "http://localhost:37373",
  remote: "https://api.example.com/mcp/sse",
});

// Generate configurations
const configs = await manager.generateConfigs(["cursor", "claude-desktop"]);

// Deploy to client directories
await manager.saveConfigs();
```

### Simple API

```typescript
import { generateClientConfigs, deployConfigs } from "@mcp/client-bridge";

// Generate configs
const configs = await generateClientConfigs({
  gateway: "http://localhost:37373",
});

// Deploy directly
await deployConfigs(
  {
    gateway: "http://localhost:37373",
  },
  {
    clients: ["cursor", "claude-desktop"],
    environment: "development",
  }
);
```

## CLI Usage

### Generate Configurations

```bash
# Generate for local development
mcp-client-bridge generate --servers '{"gateway":"http://localhost:37373"}'

# Generate for production
mcp-client-bridge generate \
  --servers '{"prod":"https://api.example.com/mcp/sse"}' \
  --environment production \
  --output ./configs

# Load from file
mcp-client-bridge generate --servers @servers.json
```

### Deploy Configurations

```bash
# Deploy to default client directories
mcp-client-bridge deploy --servers '{"gateway":"http://localhost:37373"}'

# Deploy specific clients
mcp-client-bridge deploy \
  --servers '{"gateway":"http://localhost:37373"}' \
  --clients cursor
```

### Validate & Test

```bash
# Validate configuration
mcp-client-bridge validate --servers '{"gateway":"http://localhost:37373"}'

# Test connections
mcp-client-bridge test --servers '{"gateway":"http://localhost:37373"}'
```

## API Reference

### ConfigManager

The main class for managing client configurations.

```typescript
import { ConfigManager } from "@mcp/client-bridge";

// Create from simple server URLs
const manager = ConfigManager.fromServers(
  {
    gateway: "http://localhost:37373",
    production: "https://api.example.com/mcp/sse",
  },
  {
    environment: "development",
    bridgeOptions: {
      debug: true,
      timeout: 30000,
    },
  }
);

// Add servers dynamically
manager.addServer("staging", {
  name: "staging",
  url: "https://staging.example.com/mcp/sse",
  environment: "staging",
  authRequired: true,
});

// Generate configurations
const configs = await manager.generateConfigs(["cursor"]);

// Deploy configurations
await manager.saveConfigs(["cursor", "claude-desktop"]);

// Validate and test
const validation = await manager.validateAll();
const connections = await manager.testAllConnections();
```

### Individual Clients

Work with specific clients directly:

```typescript
import { CursorClient, ClaudeDesktopClient } from "@mcp/client-bridge";

// Cursor client
const cursor = new CursorClient({ debug: true });
cursor.addServer("gateway", {
  name: "Gateway",
  url: "http://localhost:37373",
  environment: "development",
});

const cursorConfig = cursor.generateConfig();
await cursor.saveConfig("./cursor-config.json");

// Claude Desktop client
const claude = new ClaudeDesktopClient({ debug: true });
claude.addServer("gateway", {
  name: "Gateway",
  url: "http://localhost:37373",
  environment: "development",
});

const claudeConfig = claude.generateConfig();
await claude.saveConfig(); // Uses default path
```

### Bridge System

Create custom bridges or use the built-in mcp-remote bridge:

```typescript
import { MCPRemoteBridge, BaseBridge } from "@mcp/client-bridge";

// Create a bridge
const bridge = new MCPRemoteBridge(
  {
    name: "My Server",
    url: "http://localhost:37373",
    environment: "development",
  },
  {
    debug: true,
    allowHttp: true,
  }
);

// Get command for client config
const { command, args, env } = bridge.getClientCommand();

// Validate bridge
const isValid = await bridge.validate();

// Test connection
const isConnected = await bridge.testConnection();
```

## Configuration Files

### Server Configuration

Create a `servers.json` file:

```json
{
  "gateway": "http://localhost:37373",
  "linear": "https://linear.example.com/mcp/sse",
  "perplexity": "https://perplexity.example.com/mcp/sse"
}
```

### Environment Configurations

```typescript
// Development
const devConfig = ConfigManager.fromServers(servers, {
  environment: "development",
  bridgeOptions: {
    debug: true,
    allowHttp: true,
    timeout: 10000,
  },
});

// Production
const prodConfig = ConfigManager.fromServers(servers, {
  environment: "production",
  bridgeOptions: {
    debug: false,
    allowHttp: false,
    timeout: 30000,
    headers: {
      Authorization: "Bearer ${AUTH_TOKEN}",
    },
  },
});
```

## Client Configuration Paths

The library automatically detects the correct configuration paths:

### Cursor IDE

- **Custom**: Specify path when saving
- **Default**: `~/.cursor/mcp.json`

### Claude Desktop

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `~/AppData/Roaming/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Authentication

For servers requiring authentication:

```typescript
const manager = ConfigManager.fromServers(
  {
    secure: "https://api.example.com/mcp/sse",
  },
  {
    bridgeOptions: {
      headers: {
        Authorization: "Bearer ${AUTH_TOKEN}",
        "X-Client-Version": "1.0.0",
      },
    },
  }
);
```

Set environment variables:

```bash
export AUTH_TOKEN=your_token_here
```

## Integration with Monorepo

Add to your monorepo's main package.json:

```json
{
  "scripts": {
    "mcp:generate": "mcp-client-bridge generate --servers @config/servers.json",
    "mcp:deploy": "mcp-client-bridge deploy --servers @config/servers.json",
    "mcp:validate": "mcp-client-bridge validate --servers @config/servers.json"
  }
}
```

## Examples

### Local Development

```typescript
import { deployConfigs } from "@mcp/client-bridge";

await deployConfigs(
  {
    gateway: "http://localhost:37373",
  },
  {
    environment: "development",
    clients: ["cursor"],
  }
);
```

### Production Deployment

```typescript
import { ConfigManager } from "@mcp/client-bridge";

const manager = ConfigManager.fromServers(
  {
    production: "https://api.example.com/mcp/sse",
  },
  {
    environment: "production",
    bridgeOptions: {
      headers: {
        Authorization: "Bearer ${PROD_TOKEN}",
      },
    },
  }
);

await manager.saveConfigs(["claude-desktop"]);
```

### Custom Bridge Options

```typescript
const manager = ConfigManager.fromServers(
  {
    custom: "https://custom.example.com/mcp",
  },
  {
    bridgeOptions: {
      transport: "sse-only",
      timeout: 60000,
      staticOAuthClientMetadata: JSON.stringify({
        scope: "mcp:read mcp:write",
      }),
    },
  }
);
```

## Troubleshooting

### Common Issues

1. **mcp-remote not found**

   ```bash
   pnpm add -g mcp-remote
   ```

2. **Connection failed**

   ```bash
   # Check if server is running
   curl http://localhost:37373/health

   # Test with CLI
   mcp-client-bridge test --servers '{"local":"http://localhost:37373"}'
   ```

3. **Permission denied**
   ```bash
   # Check directory permissions
   ls -la ~/.cursor/
   ls -la "~/Library/Application Support/Claude/"
   ```

### Debug Mode

Enable debug logging:

```typescript
const manager = ConfigManager.fromServers(servers, {
  bridgeOptions: { debug: true },
});
```

Or via CLI:

```bash
mcp-client-bridge generate --servers '...' --debug
```

## Contributing

This package is part of the MCP monorepo. See the main README for development instructions.

## License

MIT
