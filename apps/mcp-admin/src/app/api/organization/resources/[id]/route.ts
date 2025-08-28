import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServiceFactory } from "@/lib/services/service.factory";

const UpdateResourceSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters")
    .optional(),
  uri: z
    .string()
    .min(1, "URI is required")
    .max(2000, "URI must be less than 2000 characters")
    .optional(),
  mimeType: z
    .string()
    .max(200, "MIME type must be less than 200 characters")
    .optional()
    .nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userService = ServiceFactory.getUserService();
    const resourceService = ServiceFactory.getResourceService();

    const user = await userService.getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateResourceSchema.parse(body);

    const serviceData = {
      ...validatedData,
      mimeType:
        validatedData.mimeType === null ? undefined : validatedData.mimeType,
    };

    const updatedResource = await resourceService.updateResource(
      id,
      serviceData
    );

    return NextResponse.json({
      resource: updatedResource,
      success: true,
      message: "Resource updated successfully",
    });
  } catch (error) {
    console.error("Error updating resource:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Resource not found") {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userService = ServiceFactory.getUserService();
    const resourceService = ServiceFactory.getResourceService();

    const user = await userService.getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    await resourceService.deleteResource(id);

    return NextResponse.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting resource:", error);

    if (error instanceof Error && error.message === "Resource not found") {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}
