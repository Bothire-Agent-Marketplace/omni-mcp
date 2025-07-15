# Database Setup Guide

## Overview

This guide walks you through setting up the PostgreSQL database for the multi-tenant MCP admin
system.

## Prerequisites

- **PostgreSQL 14+** installed and running
- **Node.js 18+** and **pnpm** installed
- **Environment variables** configured

## Quick Start

### 1. Install Dependencies

```bash
cd apps/mcp-admin
pnpm install
```

### 2. Database Configuration

Create a `.env.local` file in `apps/mcp-admin/`:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_admin?schema=public"

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Next.js Configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Development Configuration
NODE_ENV=development
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Create and run migrations
pnpm db:migrate

# Seed the database with default data
pnpm db:seed

# (Optional) Open Prisma Studio for database exploration
pnpm db:studio
```

### 4. Verify Setup

```bash
# Check database health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "status": "healthy",
    "connected": true
  },
  "environment": "development"
}

# Test webhook endpoint (when running pnpm dev from root)
curl https://bothire.ngrok.app/api/webhooks/test

# Expected response:
{
  "message": "Test webhook endpoint is working",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. Configure Clerk Webhooks

In your Clerk dashboard, configure the webhook endpoint:

1. Go to **Webhooks** in your Clerk dashboard
2. Click **Add Endpoint**
3. Set the endpoint URL to: `https://bothire.ngrok.app/api/webhooks/clerk`
4. Select the following events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`
5. Copy the signing secret and add it to your `.env.local` as `CLERK_WEBHOOK_SECRET`

## Database Schema

### Core Tables

#### Organizations (`organizations`)

- Primary tenant entity for multi-tenancy
- Contains organization details and metadata
- Links to Clerk organization data

#### Users (`users`)

- Individual user accounts
- Synchronized with Clerk user data
- Soft deletion support

#### Organization Memberships (`organization_memberships`)

- Many-to-many relationship between users and organizations
- Role-based access control (ADMIN, MEMBER, VIEWER)
- Tracks Clerk membership data

#### MCP Servers (`mcp_servers`)

- Registry of available MCP servers
- Capability definitions
- Active/inactive status

#### Organization Services (`organization_services`)

- Controls which MCP servers each organization can access
- Custom configuration per organization-service combination

### Audit and Management

#### Audit Logs (`audit_logs`)

- Complete audit trail of all changes
- Tracks user actions and system events
- Supports compliance and debugging

#### API Keys (`api_keys`)

- Organization-scoped API keys
- Programmatic access control
- Expiration and usage tracking

#### Sessions (`sessions`)

- User session management
- Organization context tracking
- Session metadata storage

## Development Commands

```bash
# Database operations
pnpm db:generate        # Generate Prisma client
pnpm db:push           # Push schema changes to database
pnpm db:migrate        # Create and run migrations
pnpm db:studio         # Open Prisma Studio
pnpm db:seed           # Seed database with default data

# Development
pnpm dev              # Start development server
pnpm dev:with-ngrok   # Start with ngrok for webhook testing
```

> **🚨 Important:** When running `pnpm dev` from the project root, the webhook endpoint is
> automatically started at `https://bothire.ngrok.app/api/webhooks/clerk` to ensure Clerk stays
> synchronized with the database during development.

## Production Deployment

### Environment Variables

```env
# Production database
DATABASE_URL="postgresql://user:pass@prod-host:5432/mcp_admin?schema=public"

# Clerk production keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Production configuration
NODE_ENV=production
```

### Migration Strategy

```bash
# 1. Generate migration files
pnpm db:migrate

# 2. Deploy to production
pnpm db:push

# 3. Run seed data (if needed)
pnpm db:seed
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_ctl status

# Test connection
psql -h localhost -U username -d mcp_admin

# Verify DATABASE_URL format
echo $DATABASE_URL
```

#### Migration Issues

```bash
# Reset database (development only)
pnpm db:push --force-reset

# Generate new migration
pnpm db:migrate --name "description"
```

#### Seed Issues

```bash
# Check for existing data
pnpm db:studio

# Reset and reseed
pnpm db:push --force-reset
pnpm db:seed
```

### Database Health Check

The health check endpoint provides system status:

```bash
# Check overall health
curl http://localhost:3000/api/health

# Expected healthy response
{
  "status": "ok",
  "database": {
    "status": "healthy",
    "connected": true
  }
}

# Expected unhealthy response
{
  "status": "error",
  "database": {
    "status": "unhealthy",
    "connected": false
  },
  "error": "Connection failed"
}
```

## Security Considerations

### Database Security

- Use connection pooling in production
- Enable SSL connections
- Implement proper backup strategies
- Monitor database performance

### Application Security

- API keys are hashed before storage
- Audit logs track all sensitive operations
- Soft deletion preserves data integrity
- Role-based access control enforced

## Monitoring and Maintenance

### Database Monitoring

```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('mcp_admin'));

# Monitor active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'mcp_admin';

# Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Backup Strategy

```bash
# Create backup
pg_dump -h localhost -U username mcp_admin > backup.sql

# Restore backup
psql -h localhost -U username -d mcp_admin < backup.sql
```

## Next Steps

1. **Test webhook integration** - Verify Clerk webhooks are working
2. **Implement JWT validation** - Add organization-based access control to gateway
3. **Build admin UI** - Create React components for organization management
4. **Add monitoring** - Implement logging and alerting for production
