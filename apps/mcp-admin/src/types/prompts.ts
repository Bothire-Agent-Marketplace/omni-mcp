import type { Prisma, McpServer as PrismaMcpServer } from "@mcp/database";

export type OrganizationPrompt = Prisma.OrganizationPromptGetPayload<{
  include: {
    mcpServer: true;
    createdByUser: {
      select: {
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

export type DefaultPrompt = Prisma.DefaultPromptGetPayload<{
  include: {
    mcpServer: true;
  };
}>;

export type McpServer = PrismaMcpServer;
