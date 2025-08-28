"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { PromptFormDialog } from "@/components/prompt-form-dialog";
import { Button } from "@/components/ui/button";
import type { McpServer } from "@/types/prompts";

interface CreatePromptButtonProps {
  mcpServers: McpServer[];
  organizationId: string;
  userId: string;
}

export function CreatePromptButton({
  mcpServers,
  organizationId: _organizationId,
  userId: _userId,
}: CreatePromptButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        size="lg"
        className="min-w-[140px]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Prompt
      </Button>

      <PromptFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mcpServers={mcpServers}
        onSave={() => {
          window.location.reload();
        }}
      />
    </>
  );
}
