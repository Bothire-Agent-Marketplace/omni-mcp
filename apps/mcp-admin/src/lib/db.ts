import { PrismaClient } from "@prisma/client";

// Global is used here to maintain a cache of the Prisma Client across hot reloads
// during development. This prevents connections growing exponentially
// during API Route usage.
declare global {
  var __prisma: PrismaClient | undefined;
}

// Initialize Prisma Client
export const prisma =
  global.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// Database connection and disconnection are handled automatically by Prisma
// For manual connection management, use prisma.$connect() and prisma.$disconnect()

// Health check function
export async function checkDbHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
