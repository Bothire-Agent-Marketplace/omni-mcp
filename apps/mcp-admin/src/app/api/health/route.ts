import { NextResponse } from "next/server";
import { createHealthResponse } from "@mcp/schemas";
import { checkDbHealth } from "@/lib/db";

export async function GET() {
  try {
    const isDbHealthy = await checkDbHealth();

    const health = createHealthResponse(
      isDbHealthy ? "ok" : "degraded",
      {
        database: {
          status: isDbHealthy ? "healthy" : "unhealthy",
          connected: isDbHealthy,
          lastCheck: new Date().toISOString(),
        },
      },
      process.env.NODE_ENV || "development",
      process.env.npm_package_version
    );

    const status = isDbHealthy ? 200 : 503;

    return NextResponse.json(health, { status });
  } catch (error) {
    console.error("Health check failed:", error);

    const errorResponse = createHealthResponse(
      "error",
      {
        database: {
          status: "unhealthy",
          connected: false,
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      process.env.NODE_ENV || "development"
    );

    return NextResponse.json(errorResponse, { status: 503 });
  }
}
