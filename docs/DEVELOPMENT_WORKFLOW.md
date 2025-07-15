# Development Workflow Guide

## Overview

This guide outlines the development workflow for the multi-tenant MCP platform, with automatic
webhook synchronization to ensure Clerk stays in sync with the database during development.

## Quick Start

### 1. Initial Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd omni
pnpm install

# Set up database
cd apps/mcp-admin
cp .env.example .env.local
# Edit .env.local with your database and Clerk configuration
pnpm db:migrate
pnpm db:seed
```

### 2. Development Server

```bash
# Start all services with webhook endpoint (recommended)
pnpm dev

# Alternative: Start without webhook endpoint
pnpm dev:no-webhook
```

## Automatic Webhook Synchronization

### What Happens When You Run `pnpm dev`

1. **All Services Start**: Gateway, MCP servers, and admin application
2. **Webhook Endpoint Available**: `https://bothire.ngrok.app/api/webhooks/clerk`
3. **Database Sync**: Clerk events automatically sync to database
4. **Hot Reloading**: All services reload on code changes

### Webhook Events Handled

- **User Events**: `user.created`, `user.updated`, `user.deleted`
- **Organization Events**: `organization.created`, `organization.updated`, `organization.deleted`
- **Membership Events**: `organizationMembership.created`, `organizationMembership.updated`,
  `organizationMembership.deleted`

### Testing Webhook Connectivity

```bash
# Test webhook endpoint availability
curl https://bothire.ngrok.app/api/webhooks/test

# Expected response
{
  "message": "Test webhook endpoint is working",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "webhookUrl": "https://bothire.ngrok.app/api/webhooks/clerk"
}
```

## Development Commands

### Root Level Commands

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `pnpm dev`            | Start all services + webhook endpoint       |
| `pnpm dev:no-webhook` | Start all services without webhook endpoint |
| `pnpm build`          | Build all packages and applications         |
| `pnpm test`           | Run all tests using Vitest                  |
| `pnpm lint`           | Fix linting issues and format code          |
| `pnpm audit`          | Find unused dependencies and dead code      |
| `pnpm clean`          | Remove build artifacts and node_modules     |

### Database Commands

| Command                               | Description                     |
| ------------------------------------- | ------------------------------- |
| `pnpm --filter mcp-admin db:generate` | Generate Prisma client          |
| `pnpm --filter mcp-admin db:migrate`  | Run database migrations         |
| `pnpm --filter mcp-admin db:seed`     | Seed database with default data |
| `pnpm --filter mcp-admin db:studio`   | Open Prisma Studio              |
| `pnpm --filter mcp-admin db:push`     | Push schema changes to database |

### Individual Service Commands

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `pnpm dev:gateway`     | Start only the gateway service  |
| `pnpm dev:all-servers` | Start only MCP servers          |
| `pnpm dev:with-ngrok`  | Start only admin app with ngrok |

## Clerk Configuration

### 1. Webhook Setup

In your Clerk dashboard:

1. Navigate to **Webhooks**
2. Click **Add Endpoint**
3. Set URL: `https://bothire.ngrok.app/api/webhooks/clerk`
4. Select all user, organization, and membership events
5. Copy the signing secret to your `.env.local`

### 2. Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_admin"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Next.js
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# Development
NODE_ENV="development"
```

## Development Best Practices

### 1. Always Use Webhook Endpoint

- **Run `pnpm dev` instead of `pnpm dev:no-webhook`**
- **Ensures database stays synchronized with Clerk**
- **Prevents data inconsistencies during development**

### 2. Monitor Webhook Events

```bash
# Check webhook processing logs
pnpm --filter mcp-admin dev

# Monitor database changes
pnpm --filter mcp-admin db:studio
```

### 3. Database Health Checks

```bash
# Verify database connectivity
curl http://localhost:3000/api/health

# Check webhook endpoint
curl https://bothire.ngrok.app/api/webhooks/test
```

### 4. Testing User Flows

1. **Create Organization in Clerk** → Check database sync
2. **Add/Remove Users** → Verify membership updates
3. **Update Organization Settings** → Confirm data consistency

## Troubleshooting

### Webhook Not Receiving Events

```bash
# Check if ngrok is running
pnpm ngrok:start

# Verify webhook URL in Clerk dashboard
# Should be: https://bothire.ngrok.app/api/webhooks/clerk

# Test webhook endpoint
curl https://bothire.ngrok.app/api/webhooks/test
```

### Database Connection Issues

```bash
# Check database status
pnpm --filter mcp-admin db:studio

# Verify DATABASE_URL in .env.local
# Run migrations if needed
pnpm --filter mcp-admin db:migrate
```

### Service Discovery Issues

```bash
# Check all services are running
pnpm health-check

# Restart specific service
pnpm dev:gateway
pnpm dev:all-servers
```

## Development Workflow

### 1. Daily Development Start

```bash
# Start all services with webhook
pnpm dev

# Verify all systems are working
curl http://localhost:3000/api/health
curl https://bothire.ngrok.app/api/webhooks/test
```

### 2. Making Changes

```bash
# Code changes trigger hot reload automatically
# Database changes require migration
pnpm --filter mcp-admin db:migrate

# Test changes
pnpm test
```

### 3. Debugging Issues

```bash
# Check logs for webhook events
# View in development console

# Monitor database changes
pnpm --filter mcp-admin db:studio

# Health check all services
pnpm health-check
```

## Production Preparation

### 1. Environment Variables

```env
# Production database
DATABASE_URL="postgresql://prod-user:prod-pass@prod-host:5432/mcp_admin"

# Production Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_live_..."

# Production configuration
NODE_ENV="production"
```

### 2. Deployment Checklist

- [ ] Database migrations applied
- [ ] Webhook endpoint configured in production Clerk
- [ ] All environment variables set
- [ ] Services health checked
- [ ] Backup strategy in place

## Next Steps

1. **Complete Gateway Integration** - Add JWT validation and organization-based routing
2. **Build Admin UI** - Create organization management interface
3. **Add Monitoring** - Implement logging and alerting
4. **Performance Optimization** - Database query optimization and caching

The development workflow ensures seamless integration between Clerk and your database, providing a
robust foundation for multi-tenant MCP service management.
