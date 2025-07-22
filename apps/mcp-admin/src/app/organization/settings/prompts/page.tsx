import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { PromptsView } from "@/components/views/prompts-view";

export default async function PromptsPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await DatabaseService.getOrganizationByClerkId(orgId);
  if (!organization) {
    redirect("/");
  }

  // Fetch data directly in server component
  const [prompts, defaultPrompts, mcpServers] = await Promise.all([
    DatabaseService.getOrganizationPrompts(organization.id),
    DatabaseService.getDefaultPrompts(),
    DatabaseService.getMcpServers(),
  ]);

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
