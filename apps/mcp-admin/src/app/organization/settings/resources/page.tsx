import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ServiceFactory } from "@/lib/services/service.factory";
import { ResourcesView } from "@/components/views/resources-view";

export default async function ResourcesPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organizationService = ServiceFactory.getOrganizationService();
  const resourceService = ServiceFactory.getResourceService();

  const organization = await organizationService.getOrganizationByClerkId(orgId);
  if (!organization) {
    redirect("/");
  }

  // Fetch data using the new service
  const { resources, defaultResources, mcpServers } = await resourceService.getResourcesPageData(organization.id);

  // Pass data as props to view component
  return (
    <ResourcesView
      resources={resources}
      defaultResources={defaultResources}
      mcpServers={mcpServers}
      organizationId={organization.id}
      userId={userId}
    />
  );
}
