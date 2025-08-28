import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ResourcesView } from "@/components/views/resources-view";
import { ServiceFactory } from "@/lib/services/service.factory";

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


  const { resources, defaultResources, mcpServers } = await resourceService.getResourcesPageData(organization.id);


  return (
    <ResourcesView
      resources={resources}
      defaultResources={defaultResources}
      mcpServers={mcpServers}
      organizationId={organization.id}
      userId={userId} />);


}