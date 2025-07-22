import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { DashboardView } from "@/components/views/dashboard-view";
import { OnboardingView } from "@/components/views/onboarding-view";

// Server Component for data fetching
export default async function HomePage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // First get the user record using Clerk ID, then get their organizations
  const user = await DatabaseService.getUserByClerkId(userId);
  if (!user) {
    redirect("/sign-in");
  }

  const userMemberships = await DatabaseService.getUserOrganizations(user.id);

  // Convert database format to match the view component interface
  const formattedMemberships = userMemberships.map((membership) => ({
    id: membership.id,
    role: membership.role,
    organization: {
      id: membership.organization.clerkId, // Use Clerk ID for client-side operations
      name: membership.organization.name,
      membersCount: 0, // This could be populated if needed
    },
  }));

  // If user has no organizations, show onboarding
  if (formattedMemberships.length === 0) {
    return <OnboardingView />;
  }

  // User has organizations - show dashboard
  return (
    <DashboardView
      userMemberships={formattedMemberships}
      activeOrgId={orgId || null}
    />
  );
}
