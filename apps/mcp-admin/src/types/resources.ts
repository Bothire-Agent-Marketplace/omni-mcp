import type { Prisma, McpServer as PrismaMcpServer } from "@mcp/database";

export type OrganizationResource = Prisma.OrganizationResourceGetPayload<{
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

export type DefaultResource = Prisma.DefaultResourceGetPayload<{
  include: {
    mcpServer: true;
  };
}>;

export type McpServer = PrismaMcpServer;
