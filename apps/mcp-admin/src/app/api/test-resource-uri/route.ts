import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSuccessResponse, createErrorResponse } from "@mcp/schemas";

const TestResourceUriSchema = z.object({
  uri: z.string().url("Invalid URI format"),
});

// Helper function to format bytes
function formatBytes(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uri } = TestResourceUriSchema.parse(body);

    // Only test HTTP/HTTPS URLs for security
    if (!uri.match(/^https?:\/\/.+/i)) {
      return NextResponse.json(
        createErrorResponse(
          "Only HTTP and HTTPS URLs can be tested for security reasons",
          "Security validation failed"
        ),
        { status: 400 }
      );
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
        return NextResponse.json(
          createErrorResponse(
            `HTTP ${response.status}: ${response.statusText}`,
            "Resource request failed"
          ),
          { status: 400 }
        );
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

      return NextResponse.json(
        createSuccessResponse(
          {
            contentType,
            size,
            status: response.status,
            statusText: response.statusText,
          },
          "Resource accessibility test completed successfully"
        )
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json(
            createErrorResponse(
              "Request timeout - resource took too long to respond",
              "Connection timeout"
            ),
            { status: 408 }
          );
        }

        // Handle different types of network errors
        if (fetchError.message.includes("fetch")) {
          return NextResponse.json(
            createErrorResponse(
              "Network error - unable to reach the resource",
              "Network connectivity issue"
            ),
            { status: 503 }
          );
        }

        return NextResponse.json(
          createErrorResponse(
            `Connection error: ${fetchError.message}`,
            "Connection failed"
          ),
          { status: 503 }
        );
      }

      return NextResponse.json(
        createErrorResponse(
          "Unknown error occurred while testing the resource",
          "Unexpected error"
        ),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error testing resource URI:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse(
          "Invalid request format",
          "Validation failed",
          error.issues
        ),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse(
        "Internal server error while testing resource URI",
        "Server error"
      ),
      { status: 500 }
    );
  }
}
