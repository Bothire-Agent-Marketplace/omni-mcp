"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrganizationResource, McpServer } from "@/types/resources";

interface ResourceActionsProps {
  resource: OrganizationResource;
  organizationId: string;
  mcpServers: McpServer[];
}

export function ResourceActions({
  resource,
  organizationId,
  mcpServers,
}: ResourceActionsProps) {
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this resource?")) {
      try {
        const response = await fetch(
          `/api/organization/resources/${resource.id}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          // Refresh the page to show updated data
          window.location.reload();
        } else {
          alert("Failed to delete resource");
        }
      } catch (error) {
        console.error("Error deleting resource:", error);
        alert("Failed to delete resource");
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">{resource.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  URI
                </h4>
                <code className="text-sm bg-muted p-2 rounded block break-all">
                  {resource.uri}
                </code>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </h4>
                <p className="text-sm">{resource.description}</p>
              </div>
              {resource.mimeType && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    MIME Type
                  </h4>
                  <p className="text-sm">{resource.mimeType}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  MCP Server
                </h4>
                <p className="text-sm">{resource.mcpServer.name}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TODO: Add ResourceFormDialog for editing when it exists */}
      {/* <ResourceFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        resource={resource}
        mcpServers={mcpServers}
        onSave={(updatedResource) => {
          // Refresh the page to show updated data
          window.location.reload();
        }}
      /> */}
    </>
  );
}
