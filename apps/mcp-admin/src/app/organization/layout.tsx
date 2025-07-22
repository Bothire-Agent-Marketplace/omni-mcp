import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { Separator } from "@/components/ui/separator";

// Force dynamic rendering for all organization routes
export const dynamic = "force-dynamic";

export default async function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/");
  }

  // Get organization details for context
  const organization = await DatabaseService.getOrganizationByClerkId(orgId);

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
    </div>
  );
}
