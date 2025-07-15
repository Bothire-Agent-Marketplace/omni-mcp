import {
  WebhookEvent,
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  DeletedObjectJSON,
} from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { DatabaseService } from "@/lib/db-service";

export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Missing webhook secret", { status: 500 });
  }

  // Get the webhook payload
  const payload = await req.text();

  // Get the svix headers for signature verification
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Verify the webhook signature
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

  // Handle different event types
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
  } catch (error) {
    console.error(`Error handling event ${evt.type}:`, error);
    return new Response("Error processing webhook", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

// Event handlers - now implemented with database operations
async function handleUserCreated(data: UserJSON) {
  console.log("User created:", data);
  await DatabaseService.upsertUser(data);
  console.log("✅ User created in database");
}

async function handleUserUpdated(data: UserJSON) {
  console.log("User updated:", data);
  await DatabaseService.upsertUser(data);
  console.log("✅ User updated in database");
}

async function handleUserDeleted(data: DeletedObjectJSON) {
  console.log("User deleted:", data);
  await DatabaseService.deleteUser(data);
  console.log("✅ User deleted from database");
}

async function handleOrganizationCreated(data: OrganizationJSON) {
  console.log("Organization created:", data);
  await DatabaseService.upsertOrganization(data);
  console.log("✅ Organization created in database");
}

async function handleOrganizationUpdated(data: OrganizationJSON) {
  console.log("Organization updated:", data);
  await DatabaseService.upsertOrganization(data);
  console.log("✅ Organization updated in database");
}

async function handleOrganizationDeleted(data: DeletedObjectJSON) {
  console.log("Organization deleted:", data);
  await DatabaseService.deleteOrganization(data);
  console.log("✅ Organization deleted from database");
}

async function handleOrganizationMembershipCreated(
  data: OrganizationMembershipJSON
) {
  console.log("Organization membership created:", data);
  await DatabaseService.upsertOrganizationMembership(data);
  console.log("✅ Organization membership created in database");
}

async function handleOrganizationMembershipUpdated(
  data: OrganizationMembershipJSON
) {
  console.log("Organization membership updated:", data);
  await DatabaseService.upsertOrganizationMembership(data);
  console.log("✅ Organization membership updated in database");
}

async function handleOrganizationMembershipDeleted(
  data: OrganizationMembershipJSON | DeletedObjectJSON
) {
  console.log("Organization membership deleted:", data);
  await DatabaseService.deleteOrganizationMembership(data);
  console.log("✅ Organization membership deleted from database");
}
