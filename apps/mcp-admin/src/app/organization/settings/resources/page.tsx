import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { ResourcesClient } from "./resources-client";

export default async function ResourcesPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await DatabaseService.getOrganizationByClerkId(orgId);
  if (!organization) {
    redirect("/");
  }

  // Fetch data directly in server component
  const [resources, defaultResources, mcpServers] = await Promise.all([
    DatabaseService.getOrganizationResources(organization.id),
    DatabaseService.getDefaultResources(),
    DatabaseService.getMcpServers(),
  ]);

  // Pass data as props to client component
  return (
    <ResourcesClient
      resources={resources}
      defaultResources={defaultResources}
      mcpServers={mcpServers}
      organizationId={organization.id}
      userId={userId}
    />
  );
}
