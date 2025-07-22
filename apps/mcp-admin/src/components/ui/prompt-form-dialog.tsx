"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import type { OrganizationPrompt, McpServer } from "@/types/prompts";

interface PromptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: OrganizationPrompt | null;
  mcpServers: McpServer[];
  onSave: (prompt: OrganizationPrompt) => void;
}

export function PromptFormDialog({
  open,
  onOpenChange,
  prompt,
  mcpServers,
  onSave,
}: PromptFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    mcpServerId: "",
    name: "",
    description: "",
    template: "{}",
    arguments: "{}",
  });

  const isEditing = !!prompt;

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && prompt) {
      setFormData({
        mcpServerId: prompt.mcpServer.id,
        name: prompt.name,
        description: prompt.description,
        template: JSON.stringify(prompt.template, null, 2),
        arguments: JSON.stringify(prompt.arguments, null, 2),
      });
    } else if (open && !prompt) {
      setFormData({
        mcpServerId: "",
        name: "",
        description: "",
        template: "{}",
        arguments: "{}",
      });
    }
  }, [open, prompt]);

  const validateJSON = (jsonString: string, fieldName: string) => {
    try {
      JSON.parse(jsonString);
      return null;
    } catch (error) {
      return `Invalid JSON in ${fieldName}`;
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.mcpServerId) {
      toast.error("MCP Server selection is required");
      return;
    }

    // Validate JSON
    const templateError = validateJSON(formData.template, "template");
    if (templateError) {
      toast.error(templateError);
      return;
    }

    const argumentsError = validateJSON(formData.arguments, "arguments");
    if (argumentsError) {
      toast.error(argumentsError);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        mcpServerId: formData.mcpServerId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        template: JSON.parse(formData.template),
        arguments: JSON.parse(formData.arguments),
      };

      const url = isEditing
        ? `/api/organization/prompts/${prompt?.id}`
        : "/api/organization/prompts";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          isEditing
            ? "Prompt updated successfully!"
            : "Prompt created successfully!"
        );
        onSave(data.prompt);
        onOpenChange(false);
      } else {
        toast.error(data.error || "Failed to save prompt");
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error("Failed to save prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Prompt" : "Create New Prompt"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the prompt details and configuration."
              : "Create a new custom prompt for your organization."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* MCP Server Selection */}
          <div className="space-y-2">
            <Label htmlFor="mcpServer">MCP Server</Label>
            <Select
              value={formData.mcpServerId}
              onValueChange={(value) =>
                setFormData({ ...formData, mcpServerId: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select MCP Server" />
              </SelectTrigger>
              <SelectContent>
                {mcpServers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter prompt name"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter prompt description"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label htmlFor="template">Template (JSON)</Label>
            <Textarea
              id="template"
              value={formData.template}
              onChange={(e) =>
                setFormData({ ...formData, template: e.target.value })
              }
              placeholder='{"message": "Hello {{name}}"}'
              rows={6}
              disabled={isLoading}
              className="font-mono text-sm"
            />
          </div>

          {/* Arguments Schema */}
          <div className="space-y-2">
            <Label htmlFor="arguments">Arguments Schema (JSON)</Label>
            <Textarea
              id="arguments"
              value={formData.arguments}
              onChange={(e) =>
                setFormData({ ...formData, arguments: e.target.value })
              }
              placeholder='{"name": {"type": "string", "required": true}}'
              rows={6}
              disabled={isLoading}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? "Update Prompt" : "Create Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
