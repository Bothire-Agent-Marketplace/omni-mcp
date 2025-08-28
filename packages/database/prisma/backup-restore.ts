import { existsSync } from "fs";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { PrismaClient } from "../generated/index.js";

const prisma = new PrismaClient();

const BACKUP_DIR = join(process.cwd(), "backups");

export async function backupEssentialData(): Promise<void> {
  console.log("💾 Backing up essential data...");

  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true });
  }

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: {
            organization: true,
          },
        },
      },
    });

    const organizations = await prisma.organization.findMany({
      where: { deletedAt: null },
      include: {
        memberships: {
          where: { deletedAt: null },
        },
        services: true,
      },
    });

    const organizationServices = await prisma.organizationService.findMany();

    const customPrompts = await prisma.organizationPrompt.findMany({
      where: { isActive: true },
    });

    const customResources = await prisma.organizationResource.findMany({
      where: { isActive: true },
    });

    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        users: users.map((user) => ({
          ...user,

          id: undefined,
          memberships: user.memberships.map((m) => ({
            ...m,
            id: undefined,
            userId: undefined,
            organizationId: undefined,
          })),
        })),
        organizations: organizations.map((org) => ({
          ...org,
          id: undefined,
          memberships: org.memberships.map((m) => ({
            ...m,
            id: undefined,
            userId: undefined,
            organizationId: undefined,
          })),
          services: org.services.map((s) => ({
            ...s,
            id: undefined,
            organizationId: undefined,
          })),
        })),
        organizationServices,
        customPrompts,
        customResources,
      },
    };

    const backupPath = join(BACKUP_DIR, `backup-${Date.now()}.json`);
    await writeFile(backupPath, JSON.stringify(backup, null, 2));

    const latestBackupPath = join(BACKUP_DIR, "latest-backup.json");
    await writeFile(latestBackupPath, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`📊 Backed up:`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Organizations: ${organizations.length}`);
    console.log(`  - Custom prompts: ${customPrompts.length}`);
    console.log(`  - Custom resources: ${customResources.length}`);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  }
}

export async function restoreEssentialData(backupFile?: string): Promise<void> {
  console.log("🔄 Restoring essential data...");

  try {
    const backupPath = backupFile || join(BACKUP_DIR, "latest-backup.json");

    if (!existsSync(backupPath)) {
      console.log("⚠️  No backup file found. Skipping restore.");
      return;
    }

    const backupContent = await readFile(backupPath, "utf-8");
    const backup = JSON.parse(backupContent);

    console.log(
      `📥 Restoring from backup: ${new Date(backup.timestamp).toLocaleString()}`
    );

    const orgMap = new Map<string, string>();
    for (const org of backup.data.organizations) {
      const restored = await prisma.organization.create({
        data: {
          clerkId: org.clerkId,
          name: org.name,
          slug: org.slug,
          metadata: org.metadata,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        },
      });
      orgMap.set(org.clerkId, restored.id);
      console.log(`  ✅ Organization: ${org.name}`);
    }

    const userMap = new Map<string, string>();
    for (const user of backup.data.users) {
      const restored = await prisma.user.create({
        data: {
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          metadata: user.metadata,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      userMap.set(user.clerkId, restored.id);
      console.log(`  ✅ User: ${user.email}`);
    }

    for (const org of backup.data.organizations) {
      const orgId = orgMap.get(org.clerkId);
      if (!orgId) continue;

      for (const membership of org.memberships) {
        const user = backup.data.users.find(
          (u) => u.clerkId === membership.user?.clerkId
        );
        if (!user) continue;

        const userId = userMap.get(user.clerkId);
        if (!userId) continue;

        await prisma.organizationMembership.create({
          data: {
            organizationId: orgId,
            userId: userId,
            clerkMembershipId: membership.clerkMembershipId,
            role: membership.role,
            permissions: membership.permissions,
            createdAt: membership.createdAt,
            updatedAt: membership.updatedAt,
          },
        });
        console.log(`  ✅ Membership: ${user.email} -> ${org.name}`);
      }
    }

    for (const org of backup.data.organizations) {
      const orgId = orgMap.get(org.clerkId);
      if (!orgId) continue;

      for (const service of org.services) {
        const mcpServer = await prisma.mcpServer.findFirst({
          where: { serverKey: service.mcpServer?.serverKey },
        });

        if (mcpServer) {
          await prisma.organizationService.create({
            data: {
              organizationId: orgId,
              mcpServerId: mcpServer.id,
              enabled: service.enabled,
              configuration: service.configuration,
              createdAt: service.createdAt,
              updatedAt: service.updatedAt,
            },
          });
          console.log(`  ✅ Service: ${org.name} -> ${mcpServer.name}`);
        }
      }
    }

    for (const prompt of backup.data.customPrompts) {
      const orgId = orgMap.get(prompt.organization?.clerkId);
      if (!orgId) continue;

      await prisma.organizationPrompt.create({
        data: {
          organizationId: orgId,
          mcpServerId: prompt.mcpServerId,
          name: prompt.name,
          description: prompt.description,
          template: prompt.template,
          arguments: prompt.arguments,
          isActive: prompt.isActive,
          version: prompt.version,
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt,
        },
      });
      console.log(`  ✅ Custom prompt: ${prompt.name}`);
    }

    for (const resource of backup.data.customResources) {
      const orgId = orgMap.get(resource.organization?.clerkId);
      if (!orgId) continue;

      await prisma.organizationResource.create({
        data: {
          organizationId: orgId,
          mcpServerId: resource.mcpServerId,
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          metadata: resource.metadata,
          isActive: resource.isActive,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        },
      });
      console.log(`  ✅ Custom resource: ${resource.name}`);
    }

    console.log("✅ Restore completed successfully!");
  } catch (error) {
    console.error("❌ Restore failed:", error);
    throw error;
  }
}

/**
 * CLI interface for backup/restore
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "backup":
        await backupEssentialData();
        break;
      case "restore":
        await restoreEssentialData(args[1]);
        break;
      default:
        console.log("Usage:");
        console.log("  npm run backup         - Backup essential data");
        console.log("  npm run restore        - Restore from latest backup");
        console.log("  npm run restore <file> - Restore from specific backup");
        break;
    }
  } catch (error) {
    console.error("Operation failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
