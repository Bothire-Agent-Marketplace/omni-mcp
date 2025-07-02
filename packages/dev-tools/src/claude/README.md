# Claude Desktop Integration Tools

This directory contains tools for managing Claude Desktop configuration with the Omni MCP platform.

## Files

- **`config-watcher.ts`** - Watches for changes to the central Claude Desktop config and MCP servers configuration, automatically copying updates to Claude Desktop
- **`copy-config.ts`** - Manual utility to copy the central config to Claude Desktop

## Usage

### Automatic Config Watching

Start the config watcher to automatically sync changes:

```bash
pnpm watch:config
```

This will:

- Watch `client-integrations/claude-desktop/claude_desktop_config.json` for changes
- Watch `packages/utils/src/mcp-servers.json` for MCP server updates
- Automatically copy the central config to Claude Desktop when changes are detected
- Validate JSON before copying to prevent invalid configurations

### Manual Config Copy

Copy the current config to Claude Desktop immediately:

```bash
pnpm copy:config
```

## Configuration

The central Claude Desktop configuration is located at:

```
client-integrations/claude-desktop/claude_desktop_config.json
```

This file serves as the single source of truth and is automatically copied to:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

## Architecture

The current configuration uses the **omni-mcp-gateway** as the single entry point, which routes requests to all registered MCP servers. This provides:

- Centralized management of all MCP servers
- Automatic service discovery
- Health monitoring
- Protocol translation
- Single configuration point for Claude Desktop

## Development

The watcher monitors both:

1. The main Claude Desktop config file
2. The MCP servers JSON configuration

Any changes to either file will trigger an automatic update to Claude Desktop, ensuring your configuration stays in sync during development.
