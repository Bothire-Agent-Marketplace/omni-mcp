import {
  WebhookEvent,
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  DeletedObjectJSON,
} from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";
import { DatabaseService } from "@/lib/db-service";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Missing webhook secret", { status: 500 });
  }

  const payload = await req.text();

  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const wh = new Webhook(secret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventId = svix_id;
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent) {
    console.log(`Event ${eventId} already processed, skipping...`);
    return new Response("OK", { status: 200 });
  }

  await prisma.webhookEvent.create({
    data: {
      eventId,
      eventType: evt.type,
      processedAt: new Date(),
    },
  });

  try {
    switch (evt.type) {
      case "user.created":
        await handleUserCreated(evt.data);
        break;
      case "user.updated":
        await handleUserUpdated(evt.data);
        break;
      case "user.deleted":
        await handleUserDeleted(evt.data);
        break;
      case "organization.created":
        await handleOrganizationCreated(evt.data);
        break;
      case "organization.updated":
        await handleOrganizationUpdated(evt.data);
        break;
      case "organization.deleted":
        await handleOrganizationDeleted(evt.data);
        break;
      case "organizationMembership.created":
        await handleOrganizationMembershipCreated(evt.data);
        break;
      case "organizationMembership.updated":
        await handleOrganizationMembershipUpdated(evt.data);
        break;
      case "organizationMembership.deleted":
        await handleOrganizationMembershipDeleted(evt.data);
        break;
      default:
        console.log(`Unhandled event type: ${evt.type}`);
    }
  } catch (error: unknown) {
    console.error(`Error handling event ${evt.type}:`, error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const meta =
        "meta" in error ? (error.meta as { target?: string[] }) : null;
      const target = meta?.target ? ` on ${meta.target}` : "";
      console.log(
        `Unique constraint violation for ${evt.type}${target}, but continuing...`
      );
      return new Response("OK", { status: 200 });
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("P")
    ) {
      console.log(
        `Database error ${error.code} for ${evt.type}, but continuing...`
      );
      return new Response("OK", { status: 200 });
    }

    return new Response("Error processing webhook", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

async function handleUserCreated(data: UserJSON) {
  try {
    await DatabaseService.upsertUser(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function handleUserUpdated(data: UserJSON) {
  try {
    await DatabaseService.upsertUser(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function handleUserDeleted(data: DeletedObjectJSON) {
  await DatabaseService.deleteUser(data);
}

async function handleOrganizationCreated(data: OrganizationJSON) {
  try {
    await DatabaseService.upsertOrganization(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function handleOrganizationUpdated(data: OrganizationJSON) {
  try {
    await DatabaseService.upsertOrganization(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function handleOrganizationDeleted(data: DeletedObjectJSON) {
  await DatabaseService.deleteOrganization(data);
}

async function handleOrganizationMembershipCreated(
  data: OrganizationMembershipJSON
) {
  try {
    await DatabaseService.upsertOrganizationMembership(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      console.log(
        `Organization membership ${data.id} already exists, skipping...`
      );
      return;
    }
    throw error;
  }
}

async function handleOrganizationMembershipUpdated(
  data: OrganizationMembershipJSON
) {
  try {
    await DatabaseService.upsertOrganizationMembership(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function handleOrganizationMembershipDeleted(
  data: OrganizationMembershipJSON | DeletedObjectJSON
) {
  await DatabaseService.deleteOrganizationMembership(data);
}
