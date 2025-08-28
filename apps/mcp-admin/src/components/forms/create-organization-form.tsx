"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrganizationForm() {
  const { createOrganization, setActive } = useOrganizationList();
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || isCreating || !createOrganization || !setActive)
    return;

    try {
      setIsCreating(true);


      const organization = await createOrganization({ name: orgName.trim() });


      await setActive({ organization: organization.id });


      setOrgName("");
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create organization:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        size="lg"
        className="w-full"
        disabled={!createOrganization}>

        <Plus className="mr-2 h-4 w-4" />
        Create New Organization
      </Button>);

  }

  return (
    <form onSubmit={handleCreateOrganization} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="orgName">Organization Name</Label>
        <Input
          id="orgName"
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Enter organization name"
          required
          disabled={isCreating} />

      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!orgName.trim() || isCreating}
          className="flex-1">

          {isCreating ?
          <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </> :

          <>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </>
          }
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowForm(false)}
          disabled={isCreating}>

          Cancel
        </Button>
      </div>
    </form>);

}