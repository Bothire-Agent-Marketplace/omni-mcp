import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { Separator } from "@/components/ui/separator";

export default async function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  console.log("Organization Layout Debug:", { userId, orgId });

  if (!userId) {
    console.log("No userId, redirecting to sign-in");
    redirect("/sign-in");
  }

  if (!orgId) {
    console.log("No orgId, redirecting to home");
    redirect("/");
  }

  // Get organization details for context
  console.log("Looking up organization with clerkId:", orgId);
  const organization = await DatabaseService.getOrganizationByClerkId(orgId);
  
  console.log("Organization found:", organization);
  
  if (!organization) {
    console.log("Organization not found in database, redirecting to home");
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