"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Users } from "lucide-react";
import type { Organization } from "@mcp/database/client";

interface OrganizationMembership extends Organization {
  role: string;
}

interface OrganizationContextSelectorProps {
  currentOrganization: Organization;
  availableOrganizations: OrganizationMembership[];
  selectedOrganization: Organization;
  onSelectedOrganizationChange: (org: Organization) => void;
  simulateContext: boolean;
  onSimulateContextChange: (simulate: boolean) => void;
}

export function OrganizationContextSelector({
  currentOrganization,
  availableOrganizations,
  selectedOrganization,
  onSelectedOrganizationChange,
  simulateContext,
  onSimulateContextChange
}: OrganizationContextSelectorProps) {
  const handleOrganizationChange = (clerkId: string) => {
    const org = availableOrganizations.find((o) => o.clerkId === clerkId);
    if (org) {
      onSelectedOrganizationChange(org);
    }
  };

  const handleContextModeChange = (value: string) => {
    onSimulateContextChange(value === "simulate");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Organization Context
        </CardTitle>
        <CardDescription>
          Configure organization context for testing MCP operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="selected-organization">Selected Organization</Label>
            <Select
              value={selectedOrganization.clerkId}
              onValueChange={handleOrganizationChange}>

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableOrganizations.map((org) =>
                <SelectItem key={org.clerkId} value={org.clerkId}>
                    {org.name}{" "}
                    {org.clerkId === currentOrganization.clerkId && "(Current)"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Context Mode</Label>
            <Select
              value={simulateContext ? "simulate" : "normal"}
              onValueChange={handleContextModeChange}>

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal Context</SelectItem>
                <SelectItem value="simulate">Simulate Context</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {simulateContext &&
        <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Context simulation allows testing with different organization
              contexts without switching your actual organization membership.
            </AlertDescription>
          </Alert>
        }
      </CardContent>
    </Card>);

}