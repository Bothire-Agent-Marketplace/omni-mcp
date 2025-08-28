export { db as prisma } from "@mcp/database";

export async function checkDbHealth(): Promise<boolean> {
  try {
    const { prisma } = await import("./db");
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
