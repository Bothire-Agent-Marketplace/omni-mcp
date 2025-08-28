import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServiceFactory } from "@/lib/services/service.factory";

const ResourceSchema = z.object({
  mcpServerId: z.uuid("Invalid MCP server ID"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  uri: z
    .string()
    .min(1, "URI is required")
    .max(2000, "URI must be less than 2000 characters"),
  mimeType: z
    .string()
    .max(200, "MIME type must be less than 200 characters")
    .optional()
    .nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationService = ServiceFactory.getOrganizationService();
    const resourceService = ServiceFactory.getResourceService();

    const organization =
      await organizationService.getOrganizationByClerkId(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { resources, defaultResources } =
      await resourceService.getResourcesPageData(organization.id);

    return NextResponse.json({
      resources,
      defaultResources,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching organization resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
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
    const resourceService = ServiceFactory.getResourceService();
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
    const validatedData = ResourceSchema.parse(body);

    const newResource = await resourceService.createResource({
      organizationId: organization.id,
      mcpServerId: validatedData.mcpServerId,
      name: validatedData.name,
      description: validatedData.description,
      uri: validatedData.uri,
      mimeType: validatedData.mimeType || undefined,
      metadata: validatedData.metadata,
      createdBy: user.id,
    });

    return NextResponse.json({
      resource: newResource,
      success: true,
      message: "Resource created successfully",
    });
  } catch (error) {
    console.error("Error creating organization resource:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
