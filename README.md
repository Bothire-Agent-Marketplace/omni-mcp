# Omni: MCP Platform

Omni is a monorepo for hosting and managing multiple Model Context Protocol (MCP) servers with a
central gateway and shared tooling.

Highlights

- Central gateway with capability-based routing
- Multiple MCP servers (Linear, Perplexity, DevTools, Notion)
- Admin app with testing utilities
- Client bridge to generate configs for Cursor, Claude Desktop, and LM Studio

Prerequisites

- Node.js 20+ with Corepack (to use pnpm)
- pnpm 10+
- PostgreSQL 15+ (local) with a dev database
- Google Chrome (for DevTools server)
- Optional: ngrok or localtunnel for admin auth webhook

Install prerequisites (macOS):

```bash
# Node + Corepack
brew install node@20 && corepack enable && corepack prepare pnpm@10 --activate

# PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Create dev role and database (matches .env.dev.example)
psql postgres -c "CREATE ROLE omni_dev WITH LOGIN PASSWORD 'omni_dev_password';"
createdb -O omni_dev omni_dev

# Optional tools
brew install ngrok
brew install jq
pnpm add -g localtunnel # provides the `lt` command used by dev scripts
```

Quick start

1. Install dependencies

```bash
pnpm install
```

2. Environment setup (copy examples)

```bash
cp .env.dev.example .env.local
cp secrets/.env.development.local.example secrets/.env.development.local
# Fill in Clerk keys and any API keys (Linear/Perplexity/Notion) as needed
```

Environment variables and secrets

- Root `.env.local`: general config (DB URL, ports, logging, etc.). See `.env.dev.example` for all
  keys.
- `secrets/.env.development.local`: secrets (JWT, MCP_API_KEY, CLERK_WEBHOOK_SECRET, external API
  keys).
- Loading: services load env via layered `.env*` files using `@mcp/utils/env-loader`.
- Notion: set `NOTION_API_KEY` or the Notion server will refuse to start.

3. Initialize database

```bash
pnpm db:migrate
pnpm db:seed        # or: pnpm db:seed:prompts
```

4. Start development

```bash
pnpm dev
```

Access services

```bash
# Admin UI:       http://localhost:3000
# Gateway:        http://localhost:37373
# Prisma Studio:  http://localhost:5555
```

Clerk webhooks (org/user sync)

```bash
# Start tunnel for webhooks (dev script starts ngrok automatically)
pnpm ngrok:start

# Copy the https URL shown (e.g. https://abcd1234.ngrok.app)
# In Clerk Dashboard → Webhooks → Add endpoint:
#   URL: https://<ngrok-subdomain>/api/webhooks/clerk
#   Secret: use CLERK_WEBHOOK_SECRET from secrets/.env.development.local

# Verify webhook handler is reachable
curl -s -o /dev/null -w "%{http_code}\n" https://<ngrok-subdomain>/api/health
```

Inviting users locally

1. Sign up at `http://localhost:3000/sign-up` (Clerk dev instance).
2. Create an organization in the UI or via Clerk Dashboard.
3. Invite users from Clerk (Organizations → Members → Invite). With webhooks configured, users and
   memberships are synced to the local DB automatically.

MCP client configurations (optional)

- Cursor auto-detects when you test via the Admin UI. If you want local client configs:

```bash
pnpm -w dlx mcp-client-bridge deploy --servers '{"gateway":"http://localhost:37373"}' --clients cursor
```

LM Studio uses `~/.lmstudio/mcp.json` and supports Cursor-compatible entries.

Useful commands

```bash
# Dev modes
pnpm dev                 # Start all services (recommended)
pnpm dev:clean           # Clean up ports, then start
pnpm dev:servers-only    # Only run MCP servers
pnpm cleanup             # Kill hanging processes / free ports

# Database
pnpm db:migrate          # Run Prisma migrations
pnpm db:seed             # Seed database
pnpm db:seed:prompts     # Seed default prompts/resources
pnpm db:studio           # Open Prisma Studio
pnpm db:reset            # Smart reset dev data

# Gateway health
curl http://localhost:37373/health | jq

# Dev tools (optional CLI showcase/testing)
pnpm omni-mcp health
pnpm omni-mcp showcase --examples

# DevTools browser helpers
pnpm arc                 # Launch Chrome with debugging
pnpm arc:connect         # Connect to existing Chrome session

# Webhook tunnel (optional)
pnpm ngrok:start         # Start ngrok for Clerk webhooks
```

Ports

- MCP Admin UI: 3000
- Gateway: 37373
- Linear Server: 3001
- Perplexity Server: 3002
- DevTools Server: 3003
- Notion Server: 3004
- Prisma Studio: 5555

Docs

- See `docs/` for architecture and server patterns.

License

- MIT
