import { Prisma } from "@mcp/database";
import { prisma } from "@/lib/db";

export class ResourceRepository {
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
   * Get organization resources with their MCP server info
   */
  async getOrganizationResources(organizationId: string) {
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
  async getDefaultResources() {
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
  async createResource(data: {
    organizationId: string;
    mcpServerId: string;
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
  }) {
    return await prisma.organizationResource.create({
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
  }

  /**
   * Update organization resource
   */
  async updateResource(
    resourceId: string,
    data: {
      uri?: string;
      name?: string;
      description?: string;
      mimeType?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    return await prisma.organizationResource.update({
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
  }

  /**
   * Delete organization resource (soft delete)
   */
  async deleteResource(resourceId: string) {
    return await prisma.organizationResource.update({
      where: { id: resourceId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all MCP servers for dropdown options
   */
  async getMcpServers() {
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
