import { NextResponse } from "next/server";
import { createSuccessResponse } from "@mcp/schemas";

export async function GET() {
  return NextResponse.json(
    createSuccessResponse(
      {
        environment: process.env.NODE_ENV || "development",
        webhookUrl:
          process.env.WEBHOOK_URL ||
          "https://bothire.ngrok.app/api/webhooks/clerk",
      },
      "Test webhook endpoint is working"
    )
  );
}

export async function POST() {
  return NextResponse.json(
    createSuccessResponse(
      {
        environment: process.env.NODE_ENV || "development",
      },
      "Test webhook POST endpoint is working"
    )
  );
}
