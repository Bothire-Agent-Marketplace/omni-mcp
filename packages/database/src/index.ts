import { existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { PrismaClient } from "../generated/index.js";

function loadEnvFiles() {
  const envPaths = [
    join(process.cwd(), ".env"),
    join(process.cwd(), ".env.local"),
    join(process.cwd(), "secrets", ".env.development.local"),
  ];

  for (const path of envPaths) {
    if (existsSync(path)) {
      config({ path, override: true });
    }
  }
}

loadEnvFiles();

export * from "../generated";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  clerkId: string;
  enabledServices: EnabledService[];
}

export interface EnabledService {
  id: string;
  name: string;
  description: string;
  serverKey: string;
  isActive: boolean;
  configuration: Record<string, unknown>;
}

export async function connectToDatabase() {
  try {
    await db.$connect();
    return db;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await db.$disconnect();
  } catch (error) {
    console.error("Database disconnection error:", error);
    throw error;
  }
}
