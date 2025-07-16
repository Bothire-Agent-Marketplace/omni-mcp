# Development Guide

## Quick Start

### 🚀 Start Development Environment

```bash
# Start all services (recommended)
pnpm dev

# Start after cleaning up hanging processes
pnpm dev:clean

# Start without ngrok webhook
pnpm dev:no-webhook

# Start without Prisma Studio
pnpm dev:no-studio

# Start only the servers (no studio, no ngrok)
pnpm dev:servers-only
```

### 🛑 Stop Development Environment

**New improved method:**

- Press `Ctrl+C` once - all services will shut down gracefully

**If services don't stop properly:**

```bash
# Clean up hanging processes and free ports
pnpm cleanup
```

## What Runs When You Start Dev

| Service              | Port    | Description                                             |
| -------------------- | ------- | ------------------------------------------------------- |
| 🚀 **MCP Servers**   | Various | All MCP servers (gateway, linear, perplexity, devtools) |
| 📊 **Prisma Studio** | 5555    | Database GUI at http://localhost:5555                   |
| 🌐 **Ngrok**         | -       | Webhook tunnel for external services                    |
| 🎨 **MCP Admin UI**  | 3000    | Admin interface at http://localhost:3000                |

## Development Scripts

### Core Development

- `pnpm dev` - **Main development command** (includes all services)
- `pnpm dev:clean` - Clean up ports first, then start dev
- `pnpm cleanup` - Kill hanging processes and free up ports

### Alternative Dev Modes

- `pnpm dev:legacy` - Use old concurrently-based approach
- `pnpm dev:no-webhook` - Skip ngrok tunnel
- `pnpm dev:no-studio` - Skip Prisma Studio
- `pnpm dev:servers-only` - Only MCP servers, no extras

### Database Management

- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:seed:prompts` - Seed prompts and resources
- `pnpm db:reset` - Reset database (destructive)

### Specific Services

- `pnpm dev:gateway` - Only run the gateway
- `pnpm dev:all-servers` - Only run MCP servers
- `pnpm arc` - Start Chrome with debugging
- `pnpm arc:connect` - Connect to existing Chrome instance

## Troubleshooting

### 🔧 Port Issues

If you get "port already in use" errors:

```bash
pnpm cleanup
```

### 🔄 Terminal Stuck/Scrolling Issues

The new dev script fixes most terminal issues, but if you experience problems:

1. Use `pnpm dev:legacy` (old behavior)
2. Or run services individually:

   ```bash
   # Terminal 1
   pnpm dev:servers-only

   # Terminal 2
   pnpm db:studio

   # Terminal 3
   pnpm ngrok:start
   ```

### 🐛 Service Won't Start

1. Check if ports are free: `pnpm cleanup`
2. Check database connection: `pnpm db:studio`
3. Check individual service logs by running them separately

### 📊 Prisma Studio Not Loading

1. Ensure database is running
2. Check if port 5555 is free: `lsof -i :5555`
3. Try running separately: `pnpm db:studio`

## Development Workflow

1. **Start environment**: `pnpm dev`
2. **Make changes** to code (auto-reload enabled)
3. **Access services**:
   - Admin UI: http://localhost:3000
   - Prisma Studio: http://localhost:5555
   - Gateway: http://localhost:37373
4. **Stop environment**: `Ctrl+C` (graceful shutdown)

## Tips

- **Prisma Studio** is now automatically started with dev environment
- **Graceful shutdown** properly cleans up all processes
- **Colored output** makes it easier to distinguish between services
- **Use `pnpm dev:clean`** if you suspect hanging processes
- **Individual service commands** available for debugging specific issues

## Port Map

| Service           | Port  | URL                    |
| ----------------- | ----- | ---------------------- |
| MCP Admin UI      | 3000  | http://localhost:3000  |
| Gateway           | 37373 | http://localhost:37373 |
| Linear Server     | 3002  | http://localhost:3002  |
| Perplexity Server | 3003  | http://localhost:3003  |
| DevTools Server   | 3004  | http://localhost:3004  |
| Prisma Studio     | 5555  | http://localhost:5555  |
