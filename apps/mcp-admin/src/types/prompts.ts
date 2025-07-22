// Re-export Prisma types with includes for prompt management
import type {
  OrganizationPrompt as PrismaOrganizationPrompt,
  DefaultPrompt as PrismaDefaultPrompt,
  McpServer as PrismaMcpServer,
  User as PrismaUser,
} from "@mcp/database";

// Organization prompt with related data
export type OrganizationPrompt = PrismaOrganizationPrompt & {
  mcpServer: PrismaMcpServer;
  createdByUser?: Pick<PrismaUser, "email" | "firstName" | "lastName"> | null;
};

// Default prompt with related data
export type DefaultPrompt = PrismaDefaultPrompt & {
  mcpServer: PrismaMcpServer;
};

// Re-export McpServer directly
export type McpServer = PrismaMcpServer;
