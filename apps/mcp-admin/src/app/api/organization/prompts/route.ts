import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DatabaseService } from "@/lib/db-service";

// Schema for creating/updating prompts
const PromptSchema = z.object({
  mcpServerId: z.string().uuid("Invalid MCP server ID"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  template: z.union([
    z.record(z.string(), z.unknown()), // Legacy object format
    z.array(
      z.object({
        role: z.enum(["user", "system", "assistant"]),
        content: z.string(),
      })
    ), // New array format for consistency with defaults
  ]),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

// GET /api/organization/prompts - Get organization prompts
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await DatabaseService.getOrganizationByClerkId(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const prompts = await DatabaseService.getOrganizationPrompts(
      organization.id
    );
    const defaultPrompts = await DatabaseService.getDefaultPrompts();

    return NextResponse.json({
      prompts,
      defaultPrompts,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching organization prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST /api/organization/prompts - Create new organization prompt
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await DatabaseService.getOrganizationByClerkId(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Look up the user by their Clerk ID to get the internal UUID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = PromptSchema.parse(body);

    const newPrompt = await DatabaseService.createOrganizationPrompt({
      organizationId: organization.id,
      mcpServerId: validatedData.mcpServerId,
      name: validatedData.name,
      description: validatedData.description,
      template: validatedData.template,
      arguments: validatedData.arguments,
      createdBy: user.id, // Use the internal user UUID instead of Clerk ID
    });

    return NextResponse.json({
      prompt: newPrompt,
      success: true,
      message: "Prompt created successfully",
    });
  } catch (error) {
    console.error("Error creating organization prompt:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
