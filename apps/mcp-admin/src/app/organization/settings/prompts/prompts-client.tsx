"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Eye, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PromptFormDialog } from "@/components/ui/prompt-form-dialog";
import { PromptViewer } from "@/components/ui/prompt-viewer";
import { usePrompts } from "@/hooks/use-prompts";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  OrganizationPrompt,
  DefaultPrompt,
  McpServer,
} from "@/types/prompts";

interface PromptsClientProps {
  prompts: OrganizationPrompt[];
  defaultPrompts: DefaultPrompt[];
  mcpServers: McpServer[];
  organizationId: string;
  userId: string;
}

export function PromptsClient({
  prompts: initialPrompts,
  defaultPrompts,
  mcpServers,
  organizationId: _organizationId,
  userId: _userId,
}: PromptsClientProps) {
  const isMobile = useIsMobile();

  const {
    prompts,
    selectedPrompt,
    selectedDefaultPrompt,
    editingPrompt,
    isViewDialogOpen,
    isDefaultDialogOpen,
    isFormDialogOpen,
    isLoading,
    handleViewPrompt,
    handleViewDefaultPrompt,
    handleCreatePrompt,
    handleEditPrompt,
    handleSavePrompt,
    copyFromDefault,
    deletePrompt,
    formatUserName,
    setIsViewDialogOpen,
    setIsDefaultDialogOpen,
    setIsFormDialogOpen,
  } = usePrompts({ initialPrompts });

  const handleCopyFromDefault = async (defaultPrompt: DefaultPrompt) => {
    await copyFromDefault(defaultPrompt);
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) {
      return;
    }
    await deletePrompt(promptId);
  };

  // For custom prompts viewer
  const CustomPromptViewer = () => {
    if (!selectedPrompt) return null;

    const content = (
      <PromptViewer
        prompt={selectedPrompt}
        onEdit={() => {
          setIsViewDialogOpen(false);
          handleEditPrompt(selectedPrompt);
        }}
        onCopy={() => handleCopyFromDefault(selectedPrompt as any)}
        onDelete={() => {
          setIsViewDialogOpen(false);
          handleDeletePrompt(selectedPrompt.id);
        }}
      />
    );

    if (isMobile) {
      return (
        <Drawer open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DrawerContent className="max-h-[98vh] h-[98vh]">
            <DrawerHeader className="border-b flex-shrink-0">
              <DrawerTitle className="text-xl">
                {selectedPrompt.name}
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">{content}</div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">{selectedPrompt.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">{content}</div>
        </DialogContent>
      </Dialog>
    );
  };

  // For default prompts viewer
  const DefaultPromptViewer = () => {
    if (!selectedDefaultPrompt) return null;

    const content = (
      <PromptViewer
        prompt={selectedDefaultPrompt}
        onCopy={() => handleCopyFromDefault(selectedDefaultPrompt)}
        showActions={true}
      />
    );

    if (isMobile) {
      return (
        <Drawer
          open={isDefaultDialogOpen}
          onOpenChange={setIsDefaultDialogOpen}
        >
          <DrawerContent className="max-h-[98vh] h-[98vh]">
            <DrawerHeader className="border-b flex-shrink-0">
              <DrawerTitle className="text-xl">
                {selectedDefaultPrompt.name}
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">{content}</div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isDefaultDialogOpen} onOpenChange={setIsDefaultDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">
              {selectedDefaultPrompt.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">{content}</div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">MCP Prompts</h3>
          <p className="text-sm text-muted-foreground">
            Manage custom prompts for your organization&apos;s MCP servers.
            <span className="ml-1">
              Also manage{" "}
              <a
                href="/organization/settings/resources"
                className="text-primary hover:underline"
              >
                MCP Resources
              </a>
              .
            </span>
          </p>
        </div>
        <Button onClick={handleCreatePrompt} disabled={isLoading} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Prompt
        </Button>
      </div>

      <Separator />

      {/* Custom Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Custom Prompts ({prompts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No custom prompts created yet. Create one or copy from defaults
              below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Name</TableHead>
                  <TableHead className="text-base">Description</TableHead>
                  <TableHead className="text-base">Server</TableHead>
                  <TableHead className="text-base">Version</TableHead>
                  <TableHead className="text-base">Created By</TableHead>
                  <TableHead className="text-base">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id} className="h-16">
                    <TableCell className="font-medium text-base">
                      {prompt.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-base">
                      {prompt.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-sm">
                        {prompt.mcpServer.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base">
                      v{prompt.version}
                    </TableCell>
                    <TableCell className="text-base">
                      {formatUserName(prompt.createdByUser)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handleViewPrompt(prompt)}
                          disabled={isLoading}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handleEditPrompt(prompt)}
                          disabled={isLoading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Default Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            System Default Prompts ({defaultPrompts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Name</TableHead>
                <TableHead className="text-base">Description</TableHead>
                <TableHead className="text-base">Server</TableHead>
                <TableHead className="text-base">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaultPrompts.map((prompt) => (
                <TableRow key={prompt.id} className="h-16">
                  <TableCell className="font-medium text-base">
                    {prompt.name}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-base">
                    {prompt.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-sm">
                      {prompt.mcpServer.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => handleViewDefaultPrompt(prompt)}
                        disabled={isLoading}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => handleCopyFromDefault(prompt)}
                        disabled={isLoading}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Prompt Dialog */}
      <PromptFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        prompt={editingPrompt}
        mcpServers={mcpServers}
        onSave={handleSavePrompt}
      />

      {/* Custom Prompt Viewer */}
      <CustomPromptViewer />

      {/* Default Prompt Viewer */}
      <DefaultPromptViewer />
    </div>
  );
}
