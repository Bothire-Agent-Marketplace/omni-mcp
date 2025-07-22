import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ServiceFactory } from "@/lib/services/service.factory";
import { PromptsView } from "@/components/views/prompts-view";

export default async function PromptsPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organizationService = ServiceFactory.getOrganizationService();
  const promptService = ServiceFactory.getPromptService();

  const organization = await organizationService.getOrganizationByClerkId(orgId);
  if (!organization) {
    redirect("/");
  }

  // Fetch data using the new service
  const { prompts, defaultPrompts, mcpServers } = await promptService.getPromptsPageData(organization.id);

  // Pass data as props to view component
  return (
    <PromptsView
      prompts={prompts}
      defaultPrompts={defaultPrompts}
      mcpServers={mcpServers}
      organizationId={organization.id}
      userId={userId}
    />
  );
}
