## Using the Gateway from Cursor (MCP Client)

This shows how to connect Cursor to the local MCP Gateway and call tools directly in chat.

### Prereqs

- Gateway running on `http://localhost:37373` (started via `pnpm dev`)
- Dev API key: `dev-api-key-12345` (default in gateway)

### One‑time setup (recommended)

1. Build the bridge CLI (if not built):
   - `pnpm -C packages/mcp-client-bridge build`

2. Deploy MCP config to Cursor with the local API key header included:
   - `MCP_API_KEY=dev-api-key-12345 node packages/mcp-client-bridge/dist/cli/index.js deploy --servers '{"gateway":"http://localhost:37373"}'`

3. Restart Cursor.

You should now see a server named `gateway` under MCP Tools in Cursor with tools like
`linear_search_issues`, `perplexity_search`, etc. Toggle it on if needed.

### Calling tools in Cursor

- From the MCP Tools panel, click a tool and provide arguments when prompted.
- Or ask in chat: “Run `linear_search_issues` with {"query":"PHOENIX-265","limit":5}.” Cursor will
  execute via the registered gateway.

### Programmatic local calls (optional)

You can also call tools without curl using the dev-tools CLI:

- Build: `pnpm -C packages/dev-tools build`
- Call tool:
  - `MCP_DEV_API_KEY=dev-api-key-12345 node packages/dev-tools/dist/src/cli/index.js call linear_search_issues -a '{"query":"PHOENIX-265","limit":5}'`

### Troubleshooting

- Unauthorized (401): Ensure the API key is set (via `MCP_API_KEY` at deploy time). Re‑deploy if you
  change the key.
- No tools listed: Make sure the gateway and MCP servers are healthy (`pnpm dev`), then restart
  Cursor.
- Port/URL changes: Re‑deploy the config with the updated `--servers` value.
