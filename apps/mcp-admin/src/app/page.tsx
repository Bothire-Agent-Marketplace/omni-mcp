import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ServiceFactory } from "@/lib/services/service.factory";
import { DashboardView } from "@/components/views/dashboard-view";
import { OnboardingView } from "@/components/views/onboarding-view";


export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }

    const userService = ServiceFactory.getUserService();
    const userWithOrgs = await userService.getUserWithOrganizations(userId);

    if (!userWithOrgs) {
      redirect("/sign-in");
    }


    const memberships = userWithOrgs?.memberships || [];


    const formattedMemberships = Array.isArray(memberships) ?
    memberships.map((membership) => ({
      id: membership.id,
      role: membership.role,
      organization: {
        id: membership.organization.clerkId,
        name: membership.organization.name,
        membersCount: 0
      }
    })) :
    [];

    if (!formattedMemberships || formattedMemberships.length === 0) {
      return <OnboardingView />;
    }

    return (
      <DashboardView
        userMemberships={formattedMemberships}
        activeOrgId={orgId || null} />);


  } catch (error) {
    console.error("Error loading dashboard:", error);

    return <OnboardingView />;
  }
}