# Contributing

Thanks for contributing! This repo is a pnpm + Turbo monorepo

## Getting Started

1. Install prerequisites (Node 20+, pnpm 10+, Postgres, Chrome)
2. Copy envs: `.env.dev.example → .env.local`,
   `secrets/.env.development.local.example → secrets/.env.development.local`
3. Migrate/seed DB: `pnpm db:migrate && pnpm db:seed`
4. Start dev: `pnpm dev`

## Branching & Commits

- Branch format: `feat/...`, `fix/...`, `chore/...`, `docs/...`
- Conventional commits preferred

## Lint, Types, Tests

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm audit          # knip unused code
```

## Packages & Patterns

- Use the consolidated MCP server factory from `@mcp/server-core`
- Schemas: canonical Zod in `packages/schemas/src/mcp/zod`, JSON input in
  `packages/schemas/src/mcp/input-schemas`
- Avoid runtime Zod in app servers; import from `@mcp/schemas`
- Capabilities: register in `packages/capabilities`

## Environment & Secrets

- `.env.local` for non-secret config
- `secrets/.env.development.local` for secrets (JWT, API keys, Clerk Webhook)
- Do not commit real secrets

## Webhooks (Clerk)

- Start tunnel: `pnpm ngrok:start`
- Configure endpoint: `https://<ngrok>/api/webhooks/clerk` using `CLERK_WEBHOOK_SECRET`

## PR Guidelines

- Update docs if behavior changes
- Add a minimal smoke test if you add a server or capability
- Keep changes scoped and well-described

## Code Owners

See `CODEOWNERS` for review requirements.
