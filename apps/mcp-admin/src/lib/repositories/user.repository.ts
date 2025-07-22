import type { UserJSON } from "@clerk/nextjs/server";
import { Prisma } from "@mcp/database";
import { prisma } from "@/lib/db";

export class UserRepository {
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
   * Get user by Clerk ID
   */
  async findByClerkId(clerkId: string) {
    return await prisma.user.findUnique({
      where: {
        clerkId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get user by database ID
   */
  async findById(userId: string) {
    return await prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get user's organization memberships
   */
  async getUserOrganizations(userId: string) {
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
   * Create or update user from Clerk data
   */
  async upsertUser(userData: UserJSON): Promise<void> {
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
      await prisma.user.upsert({
        where: { clerkId: userData.id },
        update: {
          ...userPayload,
          updatedAt: new Date(),
        },
        create: userPayload,
      });
    } catch (error: unknown) {
      // Handle unique constraint violations gracefully
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        // User already exists, skip silently
        return;
      }
      throw error;
    }
  }

  /**
   * Create user record directly (used for membership webhooks)
   */
  async createUser(userData: {
    clerkId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  }) {
    return await prisma.user.create({
      data: {
        clerkId: userData.clerkId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        metadata: {},
      },
    });
  }

  /**
   * Soft delete user
   */
  async softDeleteUser(clerkId: string): Promise<void> {
    await prisma.user.update({
      where: { clerkId },
      data: {
        deletedAt: new Date(),
        // Anonymize email to prevent conflicts
        email: `deleted-${clerkId}@deleted.local`,
      },
    });
  }
}
