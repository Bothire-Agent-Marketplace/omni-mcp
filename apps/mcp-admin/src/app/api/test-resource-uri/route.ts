import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TestResourceUriSchema = z.object({
  uri: z.string().url("Invalid URI format"),
});

// Format bytes to human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uri } = TestResourceUriSchema.parse(body);

    // Only test HTTP/HTTPS URLs for security
    if (!uri.match(/^https?:\/\/.+/i)) {
      return NextResponse.json({
        success: false,
        error: "Only HTTP and HTTPS URLs can be tested for security reasons",
      });
    }

    // Test the URI accessibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(uri, {
        method: "HEAD", // Use HEAD to avoid downloading the full resource
        signal: controller.signal,
        headers: {
          "User-Agent": "MCP-Admin Resource Tester/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }

      // Extract metadata from headers
      const contentType = response.headers.get("content-type") || undefined;
      const contentLength = response.headers.get("content-length");
      let size: string | undefined;

      if (contentLength) {
        const bytes = parseInt(contentLength, 10);
        if (!isNaN(bytes)) {
          size = formatBytes(bytes);
        }
      }

      return NextResponse.json({
        success: true,
        contentType,
        size,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json({
            success: false,
            error: "Request timeout - resource took too long to respond",
          });
        }

        // Handle different types of network errors
        if (fetchError.message.includes("fetch")) {
          return NextResponse.json({
            success: false,
            error: "Network error - unable to reach the resource",
          });
        }

        return NextResponse.json({
          success: false,
          error: `Connection error: ${fetchError.message}`,
        });
      }

      return NextResponse.json({
        success: false,
        error: "Unknown error occurred while testing the resource",
      });
    }
  } catch (error) {
    console.error("Error testing resource URI:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while testing resource URI",
      },
      { status: 500 }
    );
  }
}
