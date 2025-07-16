# Database Reset Guide

## The Problem

When using Clerk authentication, database resets (`prisma migrate reset`) cause a **major issue**:

❌ **What gets lost:**

- All users that were synced from Clerk via webhooks
- All organizations that were created in Clerk
- All organization memberships and relationships
- Custom prompts and resources per organization
- Service enablements per organization

✅ **What survives:**

- Actual users still exist in Clerk (external)
- Organizations still exist in Clerk (external)
- Default prompts and resources (re-seeded)
- MCP server configurations (re-seeded)

## The Solution: Smart Database Reset

We've implemented a **smart reset system** that automatically backs up and restores essential data
during database resets.

### 🎯 Quick Start

**New recommended way:**

```bash
# Smart reset - automatically backs up and restores user data
pnpm db:reset

# If you need to force reset without backup (dangerous)
pnpm db:reset:force
```

### 📋 Available Commands

| Command                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `pnpm db:reset`        | **Smart reset** - backup, reset, restore          |
| `pnpm db:reset:force`  | **Dangerous** - raw Prisma reset (loses all data) |
| `pnpm db:backup`       | Manual backup of essential data                   |
| `pnpm db:restore`      | Manual restore from latest backup                 |
| `pnpm db:seed`         | Seed default data (servers, prompts, resources)   |
| `pnpm db:seed:prompts` | Seed only prompts and resources                   |

## How Smart Reset Works

### 1. **Backup Phase** 💾

- Backs up all active users and their data
- Backs up all active organizations and settings
- Backs up all organization memberships and roles
- Backs up custom prompts and resources
- Backs up service enablements per organization

### 2. **Reset Phase** 🗑️

- Runs normal Prisma migration reset
- Drops all tables and data
- Reapplies all migrations
- Runs standard seed (defaults only)

### 3. **Restore Phase** 🔄

- Restores users with original Clerk IDs
- Restores organizations with original Clerk IDs
- Restores all memberships and relationships
- Restores custom prompts and resources
- Restores service enablements

## What Gets Preserved

✅ **Always Preserved:**

- Users (with original Clerk IDs)
- Organizations (with original Clerk IDs)
- Organization memberships and roles
- Custom prompts and resources per org
- Service enablements per org
- Timestamps and metadata

✅ **Always Re-seeded:**

- Default prompts and resources
- MCP server configurations
- System-wide settings

## Backup System

### Automatic Backups

- Every smart reset creates a timestamped backup
- Latest backup is always available as `latest-backup.json`
- Backups are stored in `packages/database/backups/`

### Manual Backup/Restore

```bash
# Create backup manually
pnpm db:backup

# Restore from latest backup
pnpm db:restore

# Restore from specific backup
pnpm db:restore /path/to/backup.json
```

## Development Workflow

### 🔄 Daily Development

```bash
# Start development (includes all services)
pnpm dev

# When you need to reset database
pnpm db:reset  # Smart reset preserves your data

# Continue development
pnpm dev
```

### 🆕 Setting up New Environment

```bash
# Clone repo
git clone <repo>
cd omni

# Install dependencies
pnpm install

# Set up database
pnpm db:migrate  # Apply migrations
pnpm db:seed     # Seed defaults

# Start development
pnpm dev
```

### 🚨 Emergency Recovery

If something goes wrong:

```bash
# Check available backups
ls packages/database/backups/

# Restore from specific backup
pnpm db:restore packages/database/backups/backup-1642345678901.json

# Or restore from latest
pnpm db:restore
```

## Best Practices

### ✅ Do This

- Use `pnpm db:reset` for normal development resets
- Let the system automatically backup your data
- Test in development before making schema changes
- Keep backups if you're doing risky operations

### ❌ Don't Do This

- Don't use `pnpm db:reset:force` unless you want to lose all data
- Don't delete the backups folder
- Don't modify backup files manually
- Don't rely on this for production (use proper backups)

## Troubleshooting

### 🔧 Reset Failed

If smart reset fails:

```bash
# Check what happened
pnpm db:restore  # Try manual restore

# If restore fails, check backups
ls packages/database/backups/

# Emergency: start fresh (loses all data)
pnpm db:reset:force
```

### 🔄 Restore Failed

If restore fails:

```bash
# Check backup file exists
ls packages/database/backups/latest-backup.json

# Try with specific backup
pnpm db:restore packages/database/backups/backup-<timestamp>.json

# Last resort: start fresh
pnpm db:reset:force
pnpm db:seed
```

### 📊 Missing Data After Reset

If you notice missing data:

1. Check if smart reset was used (not force reset)
2. Check backup files exist
3. Try manual restore: `pnpm db:restore`
4. Check Clerk dashboard - users should still exist there

## Production Considerations

⚠️ **Important**: This system is designed for **development only**

For production:

- Use proper database backups
- Use blue-green deployments
- Use migration scripts instead of resets
- Plan downtime for major schema changes
- Test migration scripts in staging first

## File Structure

```
packages/database/
├── backups/                     # Backup files
│   ├── latest-backup.json      # Latest backup
│   └── backup-<timestamp>.json # Timestamped backups
├── prisma/
│   ├── backup-restore.ts       # Backup/restore logic
│   ├── smart-reset.ts         # Smart reset orchestration
│   ├── seed.ts                # Default data seeding
│   └── seed-prompts-resources.ts # Prompt/resource seeding
└── package.json               # Database commands
```

## Benefits

🎯 **Development Experience:**

- No more lost users after database resets
- No more lost organizations and memberships
- No more re-creating test data
- Seamless schema migrations

🔒 **Data Safety:**

- Automatic backups before any reset
- Multiple restore points
- Easy recovery from mistakes
- Clear separation of system vs user data

⚡ **Performance:**

- Fast backup/restore process
- Minimal downtime during resets
- Efficient data preservation
- Smart relationship handling
