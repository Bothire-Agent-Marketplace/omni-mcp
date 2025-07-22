// Use Prisma's generated types with includes - they automatically handle relationships
import type { Prisma, McpServer as PrismaMcpServer } from "@mcp/database";

// Organization resource with included relationships (matches DatabaseService.getOrganizationResources)
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

// Default resource with included relationships (matches DatabaseService.getDefaultResources)
export type DefaultResource = Prisma.DefaultResourceGetPayload<{
  include: {
    mcpServer: true;
  };
}>;

// MCP Server type (matches DatabaseService.getMcpServers)
export type McpServer = PrismaMcpServer;
