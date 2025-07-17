import jwt, { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@mcp/database/client";
import { McpLogger } from "@mcp/utils";

interface ClerkJwtPayload extends JwtPayload {
  org_id?: string; // Clerk organization ID
  org_role?: string; // User's role in organization
  org_slug?: string; // Organization slug
  sub?: string; // User ID
}

export interface OrganizationContext {
  organizationId: string;
  organizationClerkId?: string;
  userId?: string;
  userClerkId?: string;
  role?: string;
  slug?: string;
}

export class OrganizationContextService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private logger: McpLogger;

  constructor(jwtSecret: string, logger: McpLogger) {
    this.prisma = new PrismaClient();
    this.jwtSecret = jwtSecret;
    this.logger = logger;
  }

  /**
   * Extract organization context from various sources
   * Always requires proper authentication - no bypass logic
   */
  async extractOrganizationContext(
    authHeader?: string,
    apiKey?: string
  ): Promise<OrganizationContext | null> {
    try {
      // 1. Try Clerk JWT token first
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const context = await this.extractFromClerkToken(token);
        if (context) return context;
      }

      // 2. Try API key extraction
      if (apiKey) {
        const context = await this.extractFromApiKey(apiKey);
        if (context) return context;
      }

      // 3. Try extracting from session token (existing gateway sessions)
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const context = await this.extractFromSessionToken(token);
        if (context) return context;
      }

      return null;
    } catch (error) {
      this.logger.error(
        "Failed to extract organization context",
        error as Error
      );
      return null;
    }
  }

  /**
   * Extract organization context from Clerk JWT token
   */
  private async extractFromClerkToken(
    token: string
  ): Promise<OrganizationContext | null> {
    try {
      // Note: In production, you'd validate the Clerk token with Clerk's public key
      // For now, we'll decode it to extract organization info
      const decoded = jwt.decode(token) as ClerkJwtPayload;

      if (!decoded || !decoded.org_id) {
        return null;
      }

      // Look up organization in database
      const organization = await this.prisma.organization.findUnique({
        where: { clerkId: decoded.org_id },
        select: {
          id: true,
          clerkId: true,
          slug: true,
          name: true,
        },
      });

      if (!organization) {
        this.logger.warn(
          `Organization not found for Clerk ID: ${decoded.org_id}`
        );
        return null;
      }

      // Look up user if available
      let userId: string | undefined;
      if (decoded.sub) {
        const user = await this.prisma.user.findUnique({
          where: { clerkId: decoded.sub },
          select: { id: true },
        });
        userId = user?.id;
      }

      return {
        organizationId: organization.id,
        organizationClerkId: organization.clerkId,
        userId,
        userClerkId: decoded.sub,
        role: decoded.org_role,
        slug: organization.slug,
      };
    } catch (error) {
      this.logger.debug("Failed to extract from Clerk token", {
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Extract organization context from API key
   */
  private async extractFromApiKey(
    apiKey: string
  ): Promise<OrganizationContext | null> {
    try {
      // Hash the API key to match database storage
      const crypto = await import("crypto");
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

      // Look up API key in database
      const apiKeyRecord = await this.prisma.apiKey.findUnique({
        where: {
          keyHash,
          deletedAt: null,
        },
        include: {
          organization: {
            select: {
              id: true,
              clerkId: true,
              slug: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              clerkId: true,
            },
          },
        },
      });

      if (!apiKeyRecord || !apiKeyRecord.organization) {
        return null;
      }

      // Check if API key is expired
      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        this.logger.warn(
          `Expired API key used for organization: ${apiKeyRecord.organization.clerkId}`
        );
        return null;
      }

      // Update last used timestamp
      await this.prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        organizationId: apiKeyRecord.organization.id,
        organizationClerkId: apiKeyRecord.organization.clerkId,
        userId: apiKeyRecord.creator.id,
        userClerkId: apiKeyRecord.creator.clerkId,
        slug: apiKeyRecord.organization.slug,
      };
    } catch (error) {
      this.logger.debug("Failed to extract from API key", {
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Extract organization context from existing session token
   */
  private async extractFromSessionToken(
    _token: string
  ): Promise<OrganizationContext | null> {
    try {
      // This would be for existing gateway session tokens
      // For now, we don't have organization context in these tokens
      // This is a placeholder for future enhancement
      return null;
    } catch (error) {
      this.logger.debug("Failed to extract from session token", {
        error: String(error),
      });
      return null;
    }
  }
}
