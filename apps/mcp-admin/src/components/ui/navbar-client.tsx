"use client";

import {
  UserButton,
  OrganizationSwitcher,
  useAuth,
  useOrganization,
} from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, Loader2 } from "lucide-react";

export function NavbarClient() {
  const { orgId, isLoaded } = useAuth();
  const { isLoaded: orgListLoaded } = useOrganization();

  return (
    <div className="flex items-center space-x-4">
      {/* Only show settings button if org is loaded and selected */}
      {isLoaded && orgListLoaded && orgId && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/organization/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      )}

      {/* Show loading indicator while auth is loading */}
      {(!isLoaded || !orgListLoaded) && (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      <OrganizationSwitcher
        afterCreateOrganizationUrl="/"
        afterLeaveOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
        createOrganizationMode="modal"
        appearance={{
          elements: {
            rootBox: "flex items-center",
          },
        }}
      />

      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "w-8 h-8",
          },
        }}
      />
    </div>
  );
}
