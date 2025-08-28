import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServiceFactory } from "@/lib/services/service.factory";

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
    z.record(z.string(), z.unknown()),
    z.array(
      z.object({
        role: z.enum(["user", "system", "assistant"]),
        content: z.string(),
      })
    ),
  ]),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationService = ServiceFactory.getOrganizationService();
    const promptService = ServiceFactory.getPromptService();

    const organization =
      await organizationService.getOrganizationByClerkId(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { prompts, defaultPrompts } = await promptService.getPromptsPageData(
      organization.id
    );

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

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationService = ServiceFactory.getOrganizationService();
    const promptService = ServiceFactory.getPromptService();
    const userService = ServiceFactory.getUserService();

    const organization =
      await organizationService.getOrganizationByClerkId(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const user = await userService.getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = PromptSchema.parse(body);

    const newPrompt = await promptService.createPrompt({
      organizationId: organization.id,
      mcpServerId: validatedData.mcpServerId,
      name: validatedData.name,
      description: validatedData.description,
      template: validatedData.template,
      arguments: validatedData.arguments,
      createdBy: user.id,
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
