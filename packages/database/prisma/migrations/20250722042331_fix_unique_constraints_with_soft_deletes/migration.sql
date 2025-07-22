-- Fix unique constraints to exclude soft-deleted records
-- This prevents constraint violations when recreating organizations/users after soft deletion

-- Drop existing unique constraints on organizations table
DROP INDEX IF EXISTS "organizations_clerk_id_key";
DROP INDEX IF EXISTS "organizations_slug_key";

-- Drop existing unique constraints on users table  
DROP INDEX IF EXISTS "users_clerk_id_key";
DROP INDEX IF EXISTS "users_email_key";

-- Create partial unique indexes that exclude soft-deleted records
-- Organizations: only enforce uniqueness for active (non-deleted) records
CREATE UNIQUE INDEX "organizations_clerk_id_active_key" 
ON "organizations" ("clerk_id") 
WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "organizations_slug_active_key" 
ON "organizations" ("slug") 
WHERE "deleted_at" IS NULL;

-- Users: only enforce uniqueness for active (non-deleted) records
CREATE UNIQUE INDEX "users_clerk_id_active_key" 
ON "users" ("clerk_id") 
WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "users_email_active_key" 
ON "users" ("email") 
WHERE "deleted_at" IS NULL;