"use client";

import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { PromptFormDialog } from "@/components/prompt-form-dialog";
import { PromptViewer } from "@/components/prompt-viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrganizationPrompt, McpServer } from "@/types/prompts";

interface PromptActionsProps {
  prompt: OrganizationPrompt;
  organizationId: string;
  mcpServers: McpServer[];
}

export function PromptActions({
  prompt,
  organizationId: _organizationId,
  mcpServers,
}: PromptActionsProps) {
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      try {
        const response = await fetch(`/api/organization/prompts/${prompt.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          window.location.reload();
        } else {
          alert("Failed to delete prompt");
        }
      } catch (error) {
        console.error("Error deleting prompt:", error);
        alert("Failed to delete prompt");
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsViewDialogOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">{prompt.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <PromptViewer prompt={prompt} showActions={false} />
          </div>
        </DialogContent>
      </Dialog>

      {}
      <PromptFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        prompt={prompt}
        mcpServers={mcpServers}
        onSave={() => {
          window.location.reload();
        }}
      />
    </>
  );
}
