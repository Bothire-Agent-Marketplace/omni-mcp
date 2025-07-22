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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Save, X, Eye, Settings, Code } from "lucide-react";
import { toast } from "sonner";
import {
  ArgumentsSchemaBuilder,
  type ArgumentDefinition,
} from "./arguments-schema-builder";
import { TemplateEditor } from "./template-editor";
import { PromptTester } from "./prompt-tester";
import {
  argumentsToJsonSchema,
  jsonSchemaToArguments,
  validateTemplate,
} from "@/lib/prompt-utils";
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
  const [activeTab, setActiveTab] = useState("basic");

  // Form data
  const [formData, setFormData] = useState({
    mcpServerId: "",
    name: "",
    description: "",
    template: "",
  });

  // Visual editing state
  const [argumentsSchema, setArgumentsSchema] = useState<ArgumentDefinition[]>(
    []
  );
  const [isVisualMode, setIsVisualMode] = useState(true);
  const [jsonArguments, setJsonArguments] = useState("{}");

  const isEditing = !!prompt;

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && prompt) {
      setFormData({
        mcpServerId: prompt.mcpServer.id,
        name: prompt.name,
        description: prompt.description,
        template:
          typeof prompt.template === "string"
            ? prompt.template
            : JSON.stringify(prompt.template, null, 2),
      });

      // Convert existing arguments to visual format
      const existingArgs = jsonSchemaToArguments(
        prompt.arguments as Record<string, any>
      );
      setArgumentsSchema(existingArgs);
      setJsonArguments(JSON.stringify(prompt.arguments, null, 2));
    } else if (open && !prompt) {
      setFormData({
        mcpServerId: "",
        name: "",
        description: "",
        template: "",
      });
      setArgumentsSchema([]);
      setJsonArguments("{}");
    }
  }, [open, prompt]);

  // Sync between visual and JSON modes
  useEffect(() => {
    if (isVisualMode) {
      // Convert visual arguments to JSON
      const jsonSchema = argumentsToJsonSchema(argumentsSchema);
      setJsonArguments(JSON.stringify(jsonSchema, null, 2));
    }
  }, [argumentsSchema, isVisualMode]);

  const handleArgumentsChange = (newArguments: ArgumentDefinition[]) => {
    setArgumentsSchema(newArguments);
  };

  const handleJsonArgumentsChange = (newJson: string) => {
    setJsonArguments(newJson);

    // Try to parse and convert back to visual format
    try {
      const parsed = JSON.parse(newJson);
      const visualArgs = jsonSchemaToArguments(parsed);
      setArgumentsSchema(visualArgs);
    } catch (error) {
      // Invalid JSON, keep visual state as is
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Name is required");
    }
    if (!formData.description.trim()) {
      errors.push("Description is required");
    }
    if (!formData.mcpServerId) {
      errors.push("MCP Server selection is required");
    }
    if (!formData.template.trim()) {
      errors.push("Template is required");
    }

    // Validate JSON arguments if in JSON mode
    if (!isVisualMode) {
      try {
        JSON.parse(jsonArguments);
      } catch {
        errors.push("Invalid JSON in arguments");
      }
    }

    // Validate template against arguments
    const templateValidation = validateTemplate(
      formData.template,
      argumentsSchema
    );
    if (!templateValidation.isValid) {
      errors.push(...templateValidation.errors);
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(`Validation errors: ${errors.join(", ")}`);
      return;
    }

    setIsLoading(true);
    try {
      const templateObj =
        typeof formData.template === "string"
          ? { message: formData.template }
          : JSON.parse(formData.template);

      const argumentsObj = isVisualMode
        ? argumentsToJsonSchema(argumentsSchema)
        : JSON.parse(jsonArguments);

      const payload = {
        mcpServerId: formData.mcpServerId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        template: templateObj,
        arguments: argumentsObj,
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
      <DialogContent className="max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Prompt" : "Create New Prompt"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the prompt details and configuration."
              : "Create a new custom prompt for your organization."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="basic">
                <Settings className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="template">
                <Code className="w-4 h-4 mr-2" />
                Template & Arguments
              </TabsTrigger>
              <TabsTrigger value="test">
                <Eye className="w-4 h-4 mr-2" />
                Test Prompt
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 min-h-0">
              <TabsContent value="basic" className="space-y-6 mt-0">
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
                    <SelectTrigger className="h-12">
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
                    className="h-12 text-lg"
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
                    rows={4}
                    disabled={isLoading}
                    className="text-base resize-none"
                  />
                </div>
              </TabsContent>

              <TabsContent value="template" className="space-y-8 mt-0">
                {/* Template Editor */}
                <TemplateEditor
                  value={formData.template}
                  onChange={(value) =>
                    setFormData({ ...formData, template: value })
                  }
                  argumentsSchema={argumentsSchema}
                  label="Prompt Template"
                  description="Use {{variableName}} to insert dynamic values"
                  placeholder="Enter your prompt template..."
                  rows={12}
                />

                {/* Arguments Schema */}
                <div className="border-t pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-medium text-lg">
                        Arguments Configuration
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Define the variables that users can customize
                      </p>
                    </div>
                    <Tabs
                      value={isVisualMode ? "visual" : "json"}
                      onValueChange={(value) =>
                        setIsVisualMode(value === "visual")
                      }
                    >
                      <TabsList className="grid w-[200px] grid-cols-2">
                        <TabsTrigger value="visual">Visual</TabsTrigger>
                        <TabsTrigger value="json">JSON</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {isVisualMode ? (
                    <ArgumentsSchemaBuilder
                      initialArguments={argumentsSchema}
                      onChange={handleArgumentsChange}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label>Arguments Schema (JSON)</Label>
                      <Textarea
                        value={jsonArguments}
                        onChange={(e) =>
                          handleJsonArgumentsChange(e.target.value)
                        }
                        placeholder='{"argName": {"type": "string", "required": true, "description": "Description"}}'
                        rows={16}
                        className="font-mono text-sm"
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="test" className="mt-0">
                <PromptTester
                  template={formData.template}
                  argumentsSchema={argumentsSchema}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-4 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            size="lg"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} size="lg">
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
