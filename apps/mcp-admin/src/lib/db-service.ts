import {
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  DeletedObjectJSON,
} from "@clerk/nextjs/server";
import { AuditAction, MembershipRole, Prisma } from "@mcp/database";
import { prisma } from "./db";

export class DatabaseService {
  private static sanitizeForPrisma(obj: unknown): Prisma.InputJsonValue {
    if (obj === null || obj === undefined) {
      return {};
    }

    return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
  }

  private static async createAuditLog(
    organizationId: string | null,
    userId: string | null,
    entityType: string,
    entityId: string,
    action: AuditAction,
    oldValues?: Prisma.InputJsonValue | null,
    newValues?: Prisma.InputJsonValue | null,
    source: string = "webhook"
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          entityType,
          entityId,
          action,
          oldValues: oldValues || undefined,
          newValues: newValues || undefined,
          source,
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  }

  private static async generateUniqueSlug(
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existingOrg = await prisma.organization.findFirst({
      where: {
        slug: baseSlug,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (!existingOrg) {
      return baseSlug;
    }

    let counter = 1;
    let candidateSlug = `${baseSlug}-${counter}`;

    while (true) {
      const existing = await prisma.organization.findFirst({
        where: {
          slug: candidateSlug,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      if (!existing) {
        return candidateSlug;
      }

      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }
  }

  private static mapClerkRoleToDbRole(clerkRole: string): MembershipRole {
    const roleWithoutPrefix = clerkRole.replace(/^org:/, "");

    const validRoles = ["admin", "member", "viewer"] as const;
    type ValidRole = (typeof validRoles)[number];

    if (validRoles.includes(roleWithoutPrefix as ValidRole)) {
      return roleWithoutPrefix as MembershipRole;
    }

    return MembershipRole.member;
  }

  static async upsertUser(userData: UserJSON): Promise<void> {
    const sanitizedMetadata = this.sanitizeForPrisma(userData.public_metadata);
    const userPayload = {
      clerkId: userData.id,
      email: userData.email_addresses[0]?.email_address || "",
      firstName: userData.first_name || null,
      lastName: userData.last_name || null,
      imageUrl: userData.image_url || null,
      ...(sanitizedMetadata && { metadata: sanitizedMetadata }),
    };

    try {
      const user = await prisma.user.upsert({
        where: { clerkId: userData.id },
        update: {
          ...userPayload,
          updatedAt: new Date(),
        },
        create: userPayload,
      });

      await this.createAuditLog(
        null,
        user.id,
        "user",
        user.id,
        user.createdAt.getTime() === user.updatedAt.getTime()
          ? AuditAction.CREATED
          : AuditAction.UPDATED,
        null,
        this.sanitizeForPrisma(userPayload)
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return;
      }
      throw error;
    }
  }

  static async deleteUser(deletedData: DeletedObjectJSON): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { clerkId: deletedData.id },
    });

    if (!user) {
      console.warn(
        `User with Clerk ID ${deletedData.id} not found for deletion`
      );
      return;
    }

    await prisma.user.update({
      where: { clerkId: deletedData.id },
      data: {
        deletedAt: new Date(),

        email: `deleted-${deletedData.id}@deleted.local`,
      },
    });

    await this.createAuditLog(
      null,
      user.id,
      "user",
      user.id,
      AuditAction.DELETED,
      this.sanitizeForPrisma({ email: user.email }),
      null
    );
  }

  static async upsertOrganization(orgData: OrganizationJSON): Promise<void> {
    const existingOrg = await prisma.organization.findUnique({
      where: { clerkId: orgData.id },
    });

    const orgPayload = {
      clerkId: orgData.id,
      name: orgData.name,
      slug: await this.generateUniqueSlug(orgData.name, existingOrg?.id),
      metadata: this.sanitizeForPrisma(orgData.public_metadata),
    };

    if (existingOrg) {
      await prisma.organization.update({
        where: { clerkId: orgData.id },
        data: {
          ...orgPayload,
          updatedAt: new Date(),
        },
      });

      await this.createAuditLog(
        existingOrg.id,
        null,
        "organization",
        existingOrg.id,
        AuditAction.UPDATED,
        this.sanitizeForPrisma({
          name: existingOrg.name,
          slug: existingOrg.slug,
        }),
        this.sanitizeForPrisma(orgPayload)
      );
    } else {
      const newOrg = await prisma.organization.upsert({
        where: { clerkId: orgData.id },
        update: {
          ...orgPayload,
          updatedAt: new Date(),
        },
        create: orgPayload,
      });

      await this.createAuditLog(
        newOrg.id,
        null,
        "organization",
        newOrg.id,
        AuditAction.CREATED,
        null,
        this.sanitizeForPrisma(orgPayload)
      );

      await this.createDefaultServiceEnablements(newOrg.id);
    }
  }

  static async deleteOrganization(
    deletedData: DeletedObjectJSON
  ): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { clerkId: deletedData.id },
    });

    if (!org) {
      console.warn(
        `Organization with Clerk ID ${deletedData.id} not found for deletion`
      );
      return;
    }

    await prisma.organization.update({
      where: { clerkId: deletedData.id },
      data: {
        deletedAt: new Date(),

        slug: `deleted-${deletedData.id}`,
      },
    });

    await this.createAuditLog(
      org.id,
      null,
      "organization",
      org.id,
      AuditAction.DELETED,
      this.sanitizeForPrisma({ name: org.name, slug: org.slug }),
      null
    );
  }

  static async upsertOrganizationMembership(
    membershipData: OrganizationMembershipJSON
  ): Promise<void> {
    let organization = await prisma.organization.findUnique({
      where: { clerkId: membershipData.organization.id },
    });

    if (!organization) {
      await this.upsertOrganization(membershipData.organization);
      organization = await prisma.organization.findUnique({
        where: { clerkId: membershipData.organization.id },
      });
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: membershipData.public_user_data.user_id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: membershipData.public_user_data.user_id,
          email: membershipData.public_user_data.identifier,
          firstName: membershipData.public_user_data.first_name,
          lastName: membershipData.public_user_data.last_name,
          imageUrl: membershipData.public_user_data.image_url,
          metadata: {},
        },
      });
    }

    if (!organization || !user) {
      console.error("Failed to create organization or user for membership:", {
        orgId: membershipData.organization.id,
        userId: membershipData.public_user_data.user_id,
        hasOrg: !!organization,
        hasUser: !!user,
      });
      return;
    }

    const existingMembership = await prisma.organizationMembership.findUnique({
      where: { clerkMembershipId: membershipData.id },
    });

    const membershipPayload = {
      organizationId: organization.id,
      userId: user.id,
      clerkMembershipId: membershipData.id,
      role: this.mapClerkRoleToDbRole(membershipData.role),
      permissions: this.sanitizeForPrisma(membershipData.private_metadata),
    };

    if (existingMembership) {
      await prisma.organizationMembership.update({
        where: { clerkMembershipId: membershipData.id },
        data: {
          ...membershipPayload,
          updatedAt: new Date(),
        },
      });

      await this.createAuditLog(
        organization.id,
        user.id,
        "organization_membership",
        existingMembership.id,
        AuditAction.UPDATED,
        this.sanitizeForPrisma({ role: existingMembership.role }),
        this.sanitizeForPrisma({ role: membershipPayload.role })
      );
    } else {
      const newMembership = await prisma.organizationMembership.create({
        data: membershipPayload,
      });

      await this.createAuditLog(
        organization.id,
        user.id,
        "organization_membership",
        newMembership.id,
        AuditAction.CREATED,
        null,
        this.sanitizeForPrisma(membershipPayload)
      );
    }
  }

  static async deleteOrganizationMembership(
    membershipData: OrganizationMembershipJSON | DeletedObjectJSON
  ): Promise<void> {
    const membership = await prisma.organizationMembership.findUnique({
      where: { clerkMembershipId: membershipData.id },
      include: { organization: true, user: true },
    });

    if (!membership) {
      console.warn(
        `Membership with Clerk ID ${membershipData.id} not found for deletion`
      );
      return;
    }

    await prisma.organizationMembership.update({
      where: { clerkMembershipId: membershipData.id },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.createAuditLog(
      membership.organization.id,
      membership.user.id,
      "organization_membership",
      membership.id,
      AuditAction.DELETED,
      this.sanitizeForPrisma({ role: membership.role }),
      null
    );
  }

  private static async createDefaultServiceEnablements(
    organizationId: string
  ): Promise<void> {
    const defaultServices = await prisma.mcpServer.findMany({
      where: { isActive: true },
    });

    for (const service of defaultServices) {
      await prisma.organizationService.create({
        data: {
          organizationId,
          mcpServerId: service.id,
          enabled: true,
          configuration: {},
        },
      });
    }
  }

  static async getOrganizationServices(organizationId: string) {
    return await prisma.organizationService.findMany({
      where: {
        organizationId,
        enabled: true,
      },
      include: {
        mcpServer: true,
      },
    });
  }
}
