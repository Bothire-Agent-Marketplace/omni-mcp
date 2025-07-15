import {
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  DeletedObjectJSON,
} from "@clerk/nextjs/server";
import { AuditAction, MembershipRole } from "@prisma/client";
import { prisma } from "./db";

/**
 * Database service for handling Clerk webhook events
 */
export class DatabaseService {
  /**
   * Create audit log entry
   */
  private static async createAuditLog(
    organizationId: string | null,
    userId: string | null,
    entityType: string,
    entityId: string,
    action: AuditAction,
    oldValues?: object,
    newValues?: object,
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
          oldValues: oldValues || null,
          newValues: newValues || null,
          source,
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - audit logs shouldn't break the main operation
    }
  }

  /**
   * Generate slug from name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Convert Clerk role to database role
   */
  private static mapClerkRoleToDbRole(clerkRole: string): MembershipRole {
    switch (clerkRole) {
      case "admin":
        return MembershipRole.ADMIN;
      case "member":
        return MembershipRole.MEMBER;
      default:
        return MembershipRole.VIEWER;
    }
  }

  // User Operations

  /**
   * Create or update user from Clerk data
   */
  static async upsertUser(userData: UserJSON): Promise<void> {
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userData.id },
    });

    const userPayload = {
      clerkId: userData.id,
      email: userData.email_addresses[0]?.email_address || "",
      firstName: userData.first_name || null,
      lastName: userData.last_name || null,
      imageUrl: userData.image_url || null,
      metadata: userData.public_metadata || {},
    };

    if (existingUser) {
      // Update existing user
      await prisma.user.update({
        where: { clerkId: userData.id },
        data: {
          ...userPayload,
          updatedAt: new Date(),
        },
      });

      await this.createAuditLog(
        null,
        existingUser.id,
        "user",
        existingUser.id,
        AuditAction.UPDATED,
        {
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          imageUrl: existingUser.imageUrl,
        },
        userPayload
      );
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: userPayload,
      });

      await this.createAuditLog(
        null,
        newUser.id,
        "user",
        newUser.id,
        AuditAction.CREATED,
        null,
        userPayload
      );
    }
  }

  /**
   * Soft delete user
   */
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
        // Anonymize email to prevent conflicts
        email: `deleted-${deletedData.id}@deleted.local`,
      },
    });

    await this.createAuditLog(
      null,
      user.id,
      "user",
      user.id,
      AuditAction.DELETED,
      { email: user.email },
      null
    );
  }

  // Organization Operations

  /**
   * Create or update organization from Clerk data
   */
  static async upsertOrganization(orgData: OrganizationJSON): Promise<void> {
    const existingOrg = await prisma.organization.findUnique({
      where: { clerkId: orgData.id },
    });

    const orgPayload = {
      clerkId: orgData.id,
      name: orgData.name,
      slug: this.generateSlug(orgData.name),
      metadata: orgData.public_metadata || {},
    };

    if (existingOrg) {
      // Update existing organization
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
        {
          name: existingOrg.name,
          slug: existingOrg.slug,
        },
        orgPayload
      );
    } else {
      // Create new organization
      const newOrg = await prisma.organization.create({
        data: orgPayload,
      });

      await this.createAuditLog(
        newOrg.id,
        null,
        "organization",
        newOrg.id,
        AuditAction.CREATED,
        null,
        orgPayload
      );

      // Create default service enablements for new organization
      await this.createDefaultServiceEnablements(newOrg.id);
    }
  }

  /**
   * Soft delete organization
   */
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
        // Anonymize slug to prevent conflicts
        slug: `deleted-${deletedData.id}`,
      },
    });

    await this.createAuditLog(
      org.id,
      null,
      "organization",
      org.id,
      AuditAction.DELETED,
      { name: org.name, slug: org.slug },
      null
    );
  }

  // Organization Membership Operations

  /**
   * Create or update organization membership from Clerk data
   */
  static async upsertOrganizationMembership(
    membershipData: OrganizationMembershipJSON
  ): Promise<void> {
    // Get organization and user
    const [organization, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { clerkId: membershipData.organization.id },
      }),
      prisma.user.findUnique({
        where: { clerkId: membershipData.public_user_data.user_id },
      }),
    ]);

    if (!organization || !user) {
      console.error("Organization or user not found for membership:", {
        orgId: membershipData.organization.id,
        userId: membershipData.public_user_data.user_id,
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
      permissions: membershipData.private_metadata || {},
    };

    if (existingMembership) {
      // Update existing membership
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
        { role: existingMembership.role },
        { role: membershipPayload.role }
      );
    } else {
      // Create new membership
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
        membershipPayload
      );
    }
  }

  /**
   * Soft delete organization membership
   */
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
      { role: membership.role },
      null
    );
  }

  // Service Management

  /**
   * Create default service enablements for new organization
   */
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
          enabled: true, // Enable all services by default
          configuration: {},
        },
      });
    }
  }

  /**
   * Get organization's enabled services
   */
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

  /**
   * Get user's organizations and roles
   */
  static async getUserOrganizations(userId: string) {
    return await prisma.organizationMembership.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        organization: {
          where: {
            deletedAt: null,
          },
        },
      },
    });
  }
}
