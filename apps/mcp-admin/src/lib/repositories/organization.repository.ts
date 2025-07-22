import type {
  OrganizationJSON,
  OrganizationMembershipJSON,
} from "@clerk/nextjs/server";
import { Prisma, MembershipRole } from "@mcp/database";
import { prisma } from "@/lib/db";

export class OrganizationRepository {
  /**
   * Sanitize object for Prisma JSON fields by removing undefined values
   */
  private sanitizeForPrisma(obj: unknown): Prisma.InputJsonValue {
    if (obj === null || obj === undefined) {
      return {};
    }
    return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
  }

  /**
   * Generate unique slug from name
   */
  private async generateUniqueSlug(
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if base slug is unique
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

    // If not unique, add a number suffix
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

  /**
   * Convert Clerk role to database role
   */
  private mapClerkRoleToDbRole(clerkRole: string): MembershipRole {
    const roleWithoutPrefix = clerkRole.replace(/^org:/, "");
    const validRoles = ["admin", "member", "viewer"] as const;
    type ValidRole = (typeof validRoles)[number];

    if (validRoles.includes(roleWithoutPrefix as ValidRole)) {
      return roleWithoutPrefix as MembershipRole;
    }

    return MembershipRole.member;
  }

  /**
   * Get organization by Clerk ID
   */
  async findByClerkId(clerkId: string) {
    return await prisma.organization.findUnique({
      where: {
        clerkId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get organization by database ID
   */
  async findById(organizationId: string) {
    return await prisma.organization.findUnique({
      where: {
        id: organizationId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string) {
    return await prisma.organizationMembership.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Create or update organization from Clerk data
   */
  async upsertOrganization(orgData: OrganizationJSON): Promise<void> {
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
    } else {
      await prisma.organization.upsert({
        where: { clerkId: orgData.id },
        update: {
          ...orgPayload,
          updatedAt: new Date(),
        },
        create: orgPayload,
      });
    }
  }

  /**
   * Soft delete organization
   */
  async softDeleteOrganization(clerkId: string): Promise<void> {
    await prisma.organization.update({
      where: { clerkId },
      data: {
        deletedAt: new Date(),
        slug: `deleted-${clerkId}`,
      },
    });
  }

  /**
   * Create or update organization membership
   */
  async upsertMembership(membershipData: OrganizationMembershipJSON) {
    const existingMembership = await prisma.organizationMembership.findUnique({
      where: { clerkMembershipId: membershipData.id },
    });

    const membershipPayload = {
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
    } else {
      // Need organization and user IDs - this should be handled by a service
      throw new Error("Use OrganizationService to create new memberships");
    }
  }

  /**
   * Soft delete organization membership
   */
  async softDeleteMembership(clerkMembershipId: string): Promise<void> {
    await prisma.organizationMembership.update({
      where: { clerkMembershipId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
