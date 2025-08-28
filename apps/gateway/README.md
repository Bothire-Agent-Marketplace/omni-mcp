## MCP Gateway

The MCP Gateway is the single HTTP/JSON-RPC entry point for all MCP servers in this monorepo. It
enforces API-key authentication, applies security controls, and routes requests to registered
servers.

### Endpoints

- MCP JSON-RPC: `POST /mcp`
- Health: `GET /health`
- WebSocket (optional): `GET /mcp/ws`

### Authentication

All requests must include an API key (development and production).

Headers (choose one):

- `x-api-key: <key>`
- `Authorization: Bearer <key>`

Default development key: `dev-api-key-12345` (not valid in production)

### Quick start (local)

```bash
# List tools
curl -sS http://localhost:37373/mcp \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: dev-api-key-12345' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Health
curl -sS http://localhost:37373/health
```

### Testing via transports

HTTP (JSON-RPC):

```bash
# Ping
curl -sS http://localhost:37373/mcp \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: dev-api-key-12345' \
  -d '{"jsonrpc":"2.0","id":"1","method":"ping"}'

# Call a tool
curl -sS http://localhost:37373/mcp \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: dev-api-key-12345' \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"linear_search_issues","arguments":{"query":"status:open"}}}'
```

SSE (Server-Sent Events):

```bash
# Connect (Ctrl+C to exit)
curl -N http://localhost:37373/sse \
  -H 'Authorization: Bearer dev-api-key-12345'
```

WebSocket:

```bash
# Using websocat (brew install websocat)
websocat -H 'Authorization: Bearer dev-api-key-12345' \
  ws://localhost:37373/mcp/ws

# Then send a JSON-RPC message
{"jsonrpc":"2.0","id":"1","method":"ping"}
```

### Environment variables

These are read at startup; production validation enforces secure values.

- `MCP_API_KEY` (required in production)
- `JWT_SECRET` (required): session and signing secret
- `GATEWAY_PORT` (default 37373)
- `GATEWAY_HOST` (default 0.0.0.0)
- `ALLOWED_ORIGINS` (required in production; comma-separated)
- `API_RATE_LIMIT` (per-minute; enabled in production)
- `MAX_REQUEST_SIZE` (MB, default 1)
- `CORS_CREDENTIALS` (default true)
- `SESSION_TIMEOUT` (ms)
- `MAX_CONCURRENT_SESSIONS`
- `LOG_LEVEL` (debug|info|warn|error)

In development, the loader merges env from, in order of precedence:

1. `secrets/.env.<env>.local`
2. app `.env*` files
3. repo `.env*` files

### Security defaults

- API key required in all environments
- Production guardrails: refuses `dev-api-key-12345` and empty `ALLOWED_ORIGINS`
- CORS/security headers enabled in production
- Rate limiting enabled in production

### JSON-RPC request format

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "...", "arguments": {} } }
```

Common methods:

- `tools/list`, `resources/list`, `prompts/list`
- `tools/call`, `resources/read`, `prompts/get`

### Deployment (overview)

Run the Gateway as a containerized service listening on `$PORT` with the env set above. For Cloud
Run:

- Build image and deploy one service for the gateway
- Store secrets in Secret Manager or service env vars (do not bake into images)
- Set `ALLOWED_ORIGINS` to your frontend origins

### Troubleshooting

- 401/403: missing/invalid API key
- 400: schema validation failed (check JSON-RPC payload)
- 429: rate limit exceeded (production)
- 500: inspect logs; include `LOG_LEVEL=debug` in development
