import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Test webhook endpoint is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    webhookUrl:
      process.env.WEBHOOK_URL || "https://bothire.ngrok.app/api/webhooks/clerk",
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Test webhook POST endpoint is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
}
