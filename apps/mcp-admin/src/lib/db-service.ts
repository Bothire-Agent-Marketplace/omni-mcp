import {
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  DeletedObjectJSON,
} from "@clerk/nextjs/server";
import { AuditAction, MembershipRole, Prisma } from "@mcp/database";
import { prisma } from "./db";

/**
 * Database service for handling Clerk webhook events
 */
export class DatabaseService {
  /**
   * Sanitize object for Prisma JSON fields by removing undefined values
   * This is the recommended approach from Prisma documentation
   */
  private static sanitizeForPrisma(obj: unknown): Prisma.InputJsonValue {
    if (obj === null || obj === undefined) {
      return {};
    }
    // JSON.parse(JSON.stringify()) removes undefined values and ensures Prisma compatibility
    return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
  }

  /**
   * Create audit log entry
   */
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
      // Don't throw - audit logs shouldn't break the main operation
    }
  }

  /**
   * Generate unique slug from name
   */
  private static async generateUniqueSlug(
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
  private static mapClerkRoleToDbRole(clerkRole: string): MembershipRole {
    // Add debug logging to see what role Clerk is actually sending
    console.log("🔍 Mapping Clerk role to DB role:", {
      clerkRole,
      type: typeof clerkRole,
      stringified: JSON.stringify(clerkRole),
    });

    // Direct mapping since enum values now match Clerk's convention
    const validRoles = ["admin", "member", "viewer"] as const;
    type ValidRole = (typeof validRoles)[number];

    if (validRoles.includes(clerkRole as ValidRole)) {
      return clerkRole as MembershipRole;
    }

    console.warn(`⚠️ Unknown Clerk role "${clerkRole}", defaulting to member`);
    return MembershipRole.member;
  }

  // User Operations

  /**
   * Create or update user from Clerk data
   */
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
      // Use Prisma's upsert to handle race conditions gracefully
      const user = await prisma.user.upsert({
        where: { clerkId: userData.id },
        update: {
          ...userPayload,
          updatedAt: new Date(),
        },
        create: userPayload,
      });

      // Create audit log for the operation
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
      // Handle unique constraint violations gracefully
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        console.log(
          `User with clerkId ${userData.id} already exists, skipping...`
        );
        return;
      }
      throw error;
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
      this.sanitizeForPrisma({ email: user.email }),
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
      slug: await this.generateUniqueSlug(orgData.name, existingOrg?.id),
      metadata: this.sanitizeForPrisma(orgData.public_metadata),
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
        this.sanitizeForPrisma({
          name: existingOrg.name,
          slug: existingOrg.slug,
        }),
        this.sanitizeForPrisma(orgPayload)
      );
    } else {
      // Use upsert to handle both clerkId and slug uniqueness
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
      this.sanitizeForPrisma({ name: org.name, slug: org.slug }),
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
    // First, ensure the organization and user exist by creating them if needed
    // This handles the race condition where membership webhook comes before org/user webhooks

    // Create/update organization if it doesn't exist
    let organization = await prisma.organization.findUnique({
      where: { clerkId: membershipData.organization.id },
    });

    if (!organization) {
      console.log("Organization not found, creating from membership data...");
      await this.upsertOrganization(membershipData.organization);
      organization = await prisma.organization.findUnique({
        where: { clerkId: membershipData.organization.id },
      });
    }

    // Create/update user if it doesn't exist
    let user = await prisma.user.findUnique({
      where: { clerkId: membershipData.public_user_data.user_id },
    });

    if (!user) {
      console.log("User not found, creating from membership data...");
      // Create user record directly in the database to avoid complex UserJSON typing
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

    // Double-check that both exist now
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
        this.sanitizeForPrisma({ role: existingMembership.role }),
        this.sanitizeForPrisma({ role: membershipPayload.role })
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
        this.sanitizeForPrisma(membershipPayload)
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
      this.sanitizeForPrisma({ role: membership.role }),
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
        organization: {
          deletedAt: null,
        },
      },
      include: {
        organization: true,
      },
    });
  }

  /**
   * Get organization by Clerk ID
   */
  static async getOrganizationByClerkId(clerkId: string) {
    return await prisma.organization.findUnique({
      where: {
        clerkId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(organizationId: string) {
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

  // Organization Prompt Management

  /**
   * Get organization prompts with their MCP server info
   */
  static async getOrganizationPrompts(organizationId: string) {
    return await prisma.organizationPrompt.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        mcpServer: true,
        createdByUser: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get default prompts for reference
   */
  static async getDefaultPrompts() {
    return await prisma.defaultPrompt.findMany({
      include: {
        mcpServer: true,
      },
      orderBy: [{ mcpServer: { name: "asc" } }, { name: "asc" }],
    });
  }

  /**
   * Create organization prompt
   */
  static async createOrganizationPrompt(data: {
    organizationId: string;
    mcpServerId: string;
    name: string;
    description: string;
    template:
      | Record<string, unknown>
      | Array<{ role: "user" | "system" | "assistant"; content: string }>;
    arguments: Record<string, unknown>;
    createdBy?: string;
  }) {
    // Find the next available version number for this prompt name
    const existingPrompts = await prisma.organizationPrompt.findMany({
      where: {
        organizationId: data.organizationId,
        mcpServerId: data.mcpServerId,
        name: data.name,
      },
      select: {
        version: true,
      },
      orderBy: {
        version: "desc",
      },
    });

    const nextVersion =
      existingPrompts.length > 0 ? existingPrompts[0].version + 1 : 1;

    const newPrompt = await prisma.organizationPrompt.create({
      data: {
        organizationId: data.organizationId,
        mcpServerId: data.mcpServerId,
        name: data.name,
        description: data.description,
        template: this.sanitizeForPrisma(data.template),
        arguments: this.sanitizeForPrisma(data.arguments),
        createdBy: data.createdBy,
        isActive: true,
        version: nextVersion,
      },
      include: {
        mcpServer: true,
      },
    });

    await this.createAuditLog(
      data.organizationId,
      data.createdBy || null,
      "organization_prompt",
      newPrompt.id,
      AuditAction.CREATED,
      null,
      this.sanitizeForPrisma(data)
    );

    return newPrompt;
  }

  /**
   * Update organization prompt
   */
  static async updateOrganizationPrompt(
    promptId: string,
    data: {
      name?: string;
      description?: string;
      template?: Record<string, unknown>;
      arguments?: Record<string, unknown>;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existingPrompt = await prisma.organizationPrompt.findUnique({
      where: { id: promptId },
    });

    if (!existingPrompt) {
      throw new Error("Prompt not found");
    }

    const updatedPrompt = await prisma.organizationPrompt.update({
      where: { id: promptId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.template && {
          template: this.sanitizeForPrisma(data.template),
        }),
        ...(data.arguments && {
          arguments: this.sanitizeForPrisma(data.arguments),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        version: existingPrompt.version + 1,
        updatedAt: new Date(),
      },
      include: {
        mcpServer: true,
      },
    });

    await this.createAuditLog(
      existingPrompt.organizationId,
      userId || null,
      "organization_prompt",
      promptId,
      AuditAction.UPDATED,
      this.sanitizeForPrisma(existingPrompt),
      this.sanitizeForPrisma(data)
    );

    return updatedPrompt;
  }

  /**
   * Delete organization prompt (soft delete)
   */
  static async deleteOrganizationPrompt(promptId: string, userId?: string) {
    const prompt = await prisma.organizationPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw new Error("Prompt not found");
    }

    const updatedPrompt = await prisma.organizationPrompt.update({
      where: { id: promptId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    await this.createAuditLog(
      prompt.organizationId,
      userId || null,
      "organization_prompt",
      promptId,
      AuditAction.DELETED,
      this.sanitizeForPrisma({ isActive: true }),
      this.sanitizeForPrisma({ isActive: false })
    );

    return updatedPrompt;
  }

  // Organization Resource Management

  /**
   * Get organization resources with their MCP server info
   */
  static async getOrganizationResources(organizationId: string) {
    return await prisma.organizationResource.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        mcpServer: true,
        createdByUser: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get default resources for reference
   */
  static async getDefaultResources() {
    return await prisma.defaultResource.findMany({
      include: {
        mcpServer: true,
      },
      orderBy: [{ mcpServer: { name: "asc" } }, { name: "asc" }],
    });
  }

  /**
   * Create organization resource
   */
  static async createOrganizationResource(data: {
    organizationId: string;
    mcpServerId: string;
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
  }) {
    const newResource = await prisma.organizationResource.create({
      data: {
        organizationId: data.organizationId,
        mcpServerId: data.mcpServerId,
        uri: data.uri,
        name: data.name,
        description: data.description,
        mimeType: data.mimeType,
        metadata: data.metadata
          ? this.sanitizeForPrisma(data.metadata)
          : undefined,
        createdBy: data.createdBy,
        isActive: true,
      },
      include: {
        mcpServer: true,
      },
    });

    await this.createAuditLog(
      data.organizationId,
      data.createdBy || null,
      "organization_resource",
      newResource.id,
      AuditAction.CREATED,
      null,
      this.sanitizeForPrisma(data)
    );

    return newResource;
  }

  /**
   * Update organization resource
   */
  static async updateOrganizationResource(
    resourceId: string,
    data: {
      uri?: string;
      name?: string;
      description?: string;
      mimeType?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existingResource = await prisma.organizationResource.findUnique({
      where: { id: resourceId },
    });

    if (!existingResource) {
      throw new Error("Resource not found");
    }

    const updatedResource = await prisma.organizationResource.update({
      where: { id: resourceId },
      data: {
        ...(data.uri && { uri: data.uri }),
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.mimeType !== undefined && { mimeType: data.mimeType }),
        ...(data.metadata && {
          metadata: this.sanitizeForPrisma(data.metadata),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
      include: {
        mcpServer: true,
      },
    });

    await this.createAuditLog(
      existingResource.organizationId,
      userId || null,
      "organization_resource",
      resourceId,
      AuditAction.UPDATED,
      this.sanitizeForPrisma(existingResource),
      this.sanitizeForPrisma(data)
    );

    return updatedResource;
  }

  /**
   * Delete organization resource (soft delete)
   */
  static async deleteOrganizationResource(resourceId: string, userId?: string) {
    const resource = await prisma.organizationResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error("Resource not found");
    }

    const updatedResource = await prisma.organizationResource.update({
      where: { id: resourceId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    await this.createAuditLog(
      resource.organizationId,
      userId || null,
      "organization_resource",
      resourceId,
      AuditAction.DELETED,
      this.sanitizeForPrisma({ isActive: true }),
      this.sanitizeForPrisma({ isActive: false })
    );

    return updatedResource;
  }

  /**
   * Get all MCP servers for dropdown options
   */
  static async getMcpServers() {
    return await prisma.mcpServer.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }
}
