"use client";

import { Eye, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CreatePromptButton } from "../forms/create-prompt-button";
import { PromptActions } from "../forms/prompt-actions";
import { PromptViewer } from "../prompt-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import type {
  OrganizationPrompt,
  DefaultPrompt,
  McpServer } from
"@/types/prompts";

interface PromptsViewProps {
  prompts: OrganizationPrompt[];
  defaultPrompts: DefaultPrompt[];
  mcpServers: McpServer[];
  organizationId: string;
  userId: string;
}

export function PromptsView({
  prompts,
  defaultPrompts,
  mcpServers,
  organizationId,
  userId
}: PromptsViewProps) {
  const [selectedDefaultPrompt, setSelectedDefaultPrompt] =
  useState<DefaultPrompt | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const handleViewDefaultPrompt = (prompt: DefaultPrompt) => {
    setSelectedDefaultPrompt(prompt);
    setIsViewDialogOpen(true);
  };

  const handleCopyDefaultPrompt = async (prompt: DefaultPrompt) => {
    try {

      let templateContent = "";
      if (typeof prompt.template === "string") {
        templateContent = prompt.template;
      } else if (Array.isArray(prompt.template)) {
        templateContent = prompt.template.
        map((item) => {
          if (item && typeof item === "object" && "content" in item) {
            return (item as {content: string;}).content;
          }
          return JSON.stringify(item);
        }).
        join("\n\n");
      } else {
        templateContent = JSON.stringify(prompt.template, null, 2);
      }

      await navigator.clipboard.writeText(templateContent);
      toast.success(`"${prompt.name}" template copied to clipboard!`);
    } catch (error) {
      console.error("Failed to copy prompt:", error);
      toast.error("Failed to copy prompt template");
    }
  };

  return (
    <div className="space-y-6">
      {}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
          <p className="text-muted-foreground">
            Manage custom prompts for your MCP servers
          </p>
        </div>
        <CreatePromptButton
          mcpServers={mcpServers}
          organizationId={organizationId}
          userId={userId} />

      </div>

      {}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Organization Prompts</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Custom prompts created for your organization
              </p>
            </div>
            <Badge variant="outline">
              {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ?
          <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No custom prompts yet. Create your first prompt to get started.
              </p>
              <CreatePromptButton
              mcpServers={mcpServers}
              organizationId={organizationId}
              userId={userId} />

            </div> :

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) =>
              <TableRow key={prompt.id}>
                    <TableCell className="font-medium">{prompt.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{prompt.mcpServer.name}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {prompt.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{prompt.version}</Badge>
                    </TableCell>
                    <TableCell>
                      {prompt.createdByUser ?
                  <span className="text-sm">
                          {prompt.createdByUser.firstName}{" "}
                          {prompt.createdByUser.lastName}
                        </span> :

                  <span className="text-sm text-muted-foreground">
                          System
                        </span>
                  }
                    </TableCell>
                    <TableCell>
                      <PromptActions
                    prompt={prompt}
                    organizationId={organizationId}
                    mcpServers={mcpServers} />

                    </TableCell>
                  </TableRow>
              )}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Default Prompts Reference</CardTitle>
          <p className="text-sm text-muted-foreground">
            Built-in prompts available across all MCP servers for reference
          </p>
        </CardHeader>
        <CardContent>
          {defaultPrompts.length === 0 ?
          <p className="text-center py-4 text-muted-foreground">
              No default prompts available
            </p> :

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {defaultPrompts.map((prompt) =>
            <Card key={prompt.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{prompt.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {prompt.mcpServer.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prompt.description}
                      </p>
                      <div className="flex gap-1">
                        <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => handleViewDefaultPrompt(prompt)}>

                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => handleCopyDefaultPrompt(prompt)}>

                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </CardContent>
      </Card>

      {}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">
              {selectedDefaultPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {selectedDefaultPrompt &&
            <PromptViewer
              prompt={selectedDefaultPrompt}
              showActions={false} />

            }
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}