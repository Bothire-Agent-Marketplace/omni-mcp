import jwt, { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@mcp/database/client";
import { McpLogger } from "@mcp/utils";

interface ClerkJwtPayload extends JwtPayload {
  org_id?: string;
  org_role?: string;
  org_slug?: string;
  sub?: string;
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

  async extractOrganizationContext(
    authHeader?: string,
    apiKey?: string
  ): Promise<OrganizationContext | null> {
    try {
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const context = await this.extractFromClerkToken(token);
        if (context) return context;
      }

      if (apiKey) {
        const context = await this.extractFromApiKey(apiKey);
        if (context) return context;
      }

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

  private async extractFromClerkToken(
    token: string
  ): Promise<OrganizationContext | null> {
    try {
      const decoded = jwt.decode(token) as ClerkJwtPayload;

      if (!decoded || !decoded.org_id) {
        return null;
      }

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

  private async extractFromApiKey(
    apiKey: string
  ): Promise<OrganizationContext | null> {
    try {
      const crypto = await import("crypto");
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

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

      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        this.logger.warn(
          `Expired API key used for organization: ${apiKeyRecord.organization.clerkId}`
        );
        return null;
      }

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

  private async extractFromSessionToken(
    _token: string
  ): Promise<OrganizationContext | null> {
    try {
      return null;
    } catch (error) {
      this.logger.debug("Failed to extract from session token", {
        error: String(error),
      });
      return null;
    }
  }
}
