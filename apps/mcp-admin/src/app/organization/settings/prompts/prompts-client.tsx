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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromptFormDialog } from "@/components/ui/prompt-form-dialog";
import { usePrompts } from "@/hooks/use-prompts";
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
        <Button onClick={handleCreatePrompt} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Create Prompt
        </Button>
      </div>

      <Separator />

      {/* Custom Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Prompts ({prompts.length})</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell className="font-medium">{prompt.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {prompt.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{prompt.mcpServer.name}</Badge>
                    </TableCell>
                    <TableCell>v{prompt.version}</TableCell>
                    <TableCell>
                      {formatUserName(prompt.createdByUser)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPrompt(prompt)}
                          disabled={isLoading}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPrompt(prompt)}
                          disabled={isLoading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
          <CardTitle>
            System Default Prompts ({defaultPrompts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaultPrompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="font-medium">{prompt.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {prompt.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{prompt.mcpServer.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDefaultPrompt(prompt)}
                        disabled={isLoading}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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

      {/* View Custom Prompt Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.name}</DialogTitle>
            <DialogDescription>{selectedPrompt?.description}</DialogDescription>
          </DialogHeader>
          {selectedPrompt && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Server</h4>
                <Badge>{selectedPrompt.mcpServer.name}</Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Template</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(selectedPrompt.template, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">Arguments Schema</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(selectedPrompt.arguments, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Default Prompt Dialog */}
      <Dialog open={isDefaultDialogOpen} onOpenChange={setIsDefaultDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDefaultPrompt?.name}</DialogTitle>
            <DialogDescription>
              {selectedDefaultPrompt?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedDefaultPrompt && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Server</h4>
                <Badge variant="outline">
                  {selectedDefaultPrompt.mcpServer.name}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Template</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(selectedDefaultPrompt.template, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">Arguments Schema</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(selectedDefaultPrompt.arguments, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
