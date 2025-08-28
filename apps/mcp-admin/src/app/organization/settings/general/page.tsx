import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ServiceFactory } from "@/lib/services/service.factory";

export default async function GeneralSettingsPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organizationService = ServiceFactory.getOrganizationService();
  const organization = await organizationService.getOrganizationByClerkId(orgId);

  if (!organization) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organization Information</h3>
        <p className="text-sm text-muted-foreground">
          Basic information about your organization.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            name="name"
            value={organization.name}
            disabled
            className="bg-muted" />

        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Organization Slug</Label>
          <Input
            id="slug"
            name="slug"
            value={organization.slug}
            disabled
            className="bg-muted" />

        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="created">Created</Label>
          <Input
            id="created"
            name="created"
            value={organization.createdAt.toLocaleDateString()}
            disabled
            className="bg-muted" />

        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>);

}