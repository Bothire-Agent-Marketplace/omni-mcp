/*
  Warnings:

  - The values [ADMIN,MEMBER,VIEWER] on the enum `membership_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "membership_role_new" AS ENUM ('admin', 'member', 'viewer');
ALTER TABLE "organization_memberships" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "organization_memberships" ALTER COLUMN "role" TYPE "membership_role_new" USING ("role"::text::"membership_role_new");
ALTER TYPE "membership_role" RENAME TO "membership_role_old";
ALTER TYPE "membership_role_new" RENAME TO "membership_role";
DROP TYPE "membership_role_old";
ALTER TABLE "organization_memberships" ALTER COLUMN "role" SET DEFAULT 'member';
COMMIT;

-- AlterTable
ALTER TABLE "organization_memberships" ALTER COLUMN "role" SET DEFAULT 'member';
