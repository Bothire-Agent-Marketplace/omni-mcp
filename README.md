# Omni: MCP Platform

Omni is a monorepo for hosting and managing multiple Model Context Protocol (MCP) servers with a
central gateway and shared tooling.

Highlights

- Central gateway with capability-based routing
- Multiple MCP servers (Linear, Perplexity, DevTools, Notion)
- Admin app with testing utilities
- Client bridge to generate configs for Cursor, Claude Desktop, and LM Studio

Quick start

1. Install dependencies

```bash
pnpm install
```

2. Start development

```bash
pnpm dev
```

3. Optional: seed database (admin app)

```bash
pnpm --filter mcp-admin db:migrate && pnpm --filter mcp-admin db:seed
```

MCP client configurations

- Generate and deploy configs to MCP clients via the bridge:

```bash
pnpm -w dlx mcp-client-bridge deploy --servers '{"gateway":"http://localhost:37373"}' --clients cursor,claude-desktop,lm-studio
```

LM Studio uses `~/.lmstudio/mcp.json` and supports Cursor-compatible entries.

Docs

- See `docs/` for architecture and server patterns.

License

- MIT
