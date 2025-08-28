import { Prisma } from "@mcp/database";
import { prisma } from "@/lib/db";

export class PromptRepository {
  private sanitizeForPrisma(obj: unknown): Prisma.InputJsonValue {
    if (obj === null || obj === undefined) {
      return {};
    }
    return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
  }

  async getOrganizationPrompts(organizationId: string) {
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

  async getDefaultPrompts() {
    return await prisma.defaultPrompt.findMany({
      include: {
        mcpServer: true,
      },
      orderBy: [{ mcpServer: { name: "asc" } }, { name: "asc" }],
    });
  }

  async createPrompt(data: {
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

    return await prisma.organizationPrompt.create({
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
  }

  async updatePrompt(
    promptId: string,
    data: {
      name?: string;
      description?: string;
      template?:
        | Record<string, unknown>
        | Array<{ role: "user" | "system" | "assistant"; content: string }>;
      arguments?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    return await prisma.organizationPrompt.update({
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
        updatedAt: new Date(),
      },
      include: {
        mcpServer: true,
      },
    });
  }

  async deletePrompt(promptId: string) {
    return await prisma.organizationPrompt.update({
      where: { id: promptId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

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
