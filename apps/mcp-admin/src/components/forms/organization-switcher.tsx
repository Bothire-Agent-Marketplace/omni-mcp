"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

interface OrganizationSwitcherProps {
  organizationId: string;
}

export function OrganizationSwitcher({
  organizationId,
}: OrganizationSwitcherProps) {
  const { setActive } = useOrganizationList();

  const handleSwitch = () => {
    setActive?.({ organization: organizationId });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      onClick={handleSwitch}
    >
      Switch To
    </Button>
  );
}
