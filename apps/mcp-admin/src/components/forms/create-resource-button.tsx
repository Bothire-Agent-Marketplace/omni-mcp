"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ResourceFormDialog } from "@/components/ui/resource-form-dialog";
import { useState } from "react";
import type { McpServer } from "@/types/resources";

interface CreateResourceButtonProps {
  mcpServers: McpServer[];
  organizationId: string;
  userId: string;
}

export function CreateResourceButton({
  mcpServers,
  organizationId,
  userId,
}: CreateResourceButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        size="lg"
        className="min-w-[140px]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Resource
      </Button>

      <ResourceFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mcpServers={mcpServers}
        onSave={(newResource) => {
          // Refresh the page to show updated data
          window.location.reload();
        }}
      />
    </>
  );
}
