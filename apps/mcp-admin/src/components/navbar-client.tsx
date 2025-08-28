"use client";

import {
  UserButton,
  OrganizationSwitcher,
  useAuth,
  useOrganization } from
"@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, Loader2 } from "lucide-react";

export function NavbarClient() {
  const { orgId, isLoaded } = useAuth();
  const { isLoaded: orgListLoaded } = useOrganization();

  return (
    <div className="flex items-center space-x-4">
      {}
      {isLoaded && orgListLoaded && orgId &&
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-muted-foreground hover:text-foreground">

          <Link href="/organization/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      }

      {}
      {(!isLoaded || !orgListLoaded) &&
      <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      }

      <OrganizationSwitcher
        afterCreateOrganizationUrl="/"
        afterLeaveOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
        createOrganizationMode="modal"
        appearance={{
          elements: {
            rootBox: "flex items-center",
            organizationSwitcherTrigger:
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          }
        }} />


      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "w-8 h-8 ring-2 ring-border"
          }
        }} />

    </div>);

}