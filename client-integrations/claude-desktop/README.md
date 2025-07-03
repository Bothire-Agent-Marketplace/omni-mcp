# Claude Desktop Integration

This directory contains the configuration and bridge script for integrating Claude Desktop with the
Omni MCP platform.

## Files

- `claude_desktop_config.json` - Configuration for Claude Desktop
- `mcp-bridge.cjs` - Bridge script that connects Claude Desktop to the Omni gateway
- `README.md` - This file

## How it works

1. Claude Desktop communicates with MCP servers via stdio (standard input/output)
2. The Omni gateway operates as an HTTP server
3. The `mcp-bridge.cjs` script acts as a translator:
   - Receives MCP protocol messages from Claude Desktop via stdio
   - Forwards them to the HTTP gateway at `http://localhost:3000/mcp`
   - Returns responses back to Claude Desktop

## Setup

1. Ensure the Omni gateway is running on port 3000:

   ```bash
   pnpm dev
   ```

2. Copy the `claude_desktop_config.json` to your Claude Desktop configuration directory

3. Restart Claude Desktop to pick up the new configuration

## Configuration Location

The Claude Desktop configuration file should be placed in:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
