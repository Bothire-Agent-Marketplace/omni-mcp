import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db";

export async function GET() {
  try {
    // Check database health
    const isDbHealthy = await checkDbHealth();

    // Basic health check response
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        status: isDbHealthy ? "healthy" : "unhealthy",
        connected: isDbHealthy,
      },
      environment: process.env.NODE_ENV || "development",
    };

    // Return appropriate status code
    const status = isDbHealthy ? 200 : 503;

    return NextResponse.json(health, { status });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: {
          status: "unhealthy",
          connected: false,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
