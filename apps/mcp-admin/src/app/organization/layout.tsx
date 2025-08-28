import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ServiceFactory } from "@/lib/services/service.factory";
import { Separator } from "@/components/ui/separator";


export const dynamic = "force-dynamic";

export default async function OrganizationLayout({
  children


}: {children: React.ReactNode;}) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/");
  }


  const organizationService = ServiceFactory.getOrganizationService();
  const organization =
  await organizationService.getOrganizationByClerkId(orgId);

  if (!organization) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {organization.name}
          </h1>
          <p className="text-muted-foreground">Organization Management</p>
        </div>
        <Separator />
        {children}
      </div>
    </div>);

}