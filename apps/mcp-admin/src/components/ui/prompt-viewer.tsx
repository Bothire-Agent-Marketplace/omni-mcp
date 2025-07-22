"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Copy,
  User,
  Settings,
  Code,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import type { OrganizationPrompt, DefaultPrompt } from "@/types/prompts";
import { extractVariablesFromTemplate } from "@/lib/prompt-utils";

// Type for argument configuration in prompt schema
interface ArgumentConfig {
  type?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  enum?: string[];
}

interface PromptViewerProps {
  prompt: OrganizationPrompt | DefaultPrompt;
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

export function PromptViewer({
  prompt,
  className,
  showActions = true,
  onEdit,
  onCopy,
  onDelete,
}: PromptViewerProps) {
  const isCustomPrompt = "version" in prompt && "createdByUser" in prompt;

  // Extract template content for display
  const templateContent = (() => {
    if (typeof prompt.template === "string") {
      return prompt.template;
    } else if (Array.isArray(prompt.template)) {
      // Handle new message format (default prompts and normalized custom prompts)
      return prompt.template
        .map((item) => {
          if (item && typeof item === "object" && "content" in item) {
            return (item as { content: string }).content;
          }
          return JSON.stringify(item);
        })
        .join("\n\n");
    } else if (
      typeof prompt.template === "object" &&
      prompt.template !== null
    ) {
      // Handle legacy custom prompt formats
      const templateObj = prompt.template as Record<string, unknown>;

      // If it has a message property, extract that
      if ("message" in templateObj && typeof templateObj.message === "string") {
        return templateObj.message;
      }

      // Otherwise, stringify the whole object
      return JSON.stringify(templateObj, null, 2);
    } else {
      return JSON.stringify(prompt.template, null, 2);
    }
  })();

  // Extract variables from template
  const variables = extractVariablesFromTemplate(templateContent);

  // Parse arguments schema
  const argumentsSchema = prompt.arguments as Record<string, ArgumentConfig>;
  const argumentEntries = Object.entries(argumentsSchema || {});

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatUserName = (
    user?: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    } | null
  ) => {
    if (!user) return "System";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{prompt.name}</h2>
            {isCustomPrompt && (
              <>
                <Badge variant="secondary" className="text-xs">
                  v{(prompt as OrganizationPrompt).version}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Custom
                </Badge>
              </>
            )}
            {!isCustomPrompt && (
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
              >
                Default
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">{prompt.description}</p>

          {/* Meta information */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Server className="w-4 h-4" />
              <span>{prompt.mcpServer.name}</span>
            </div>

            {isCustomPrompt && (
              <>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>
                    Created by{" "}
                    {formatUserName(
                      (prompt as OrganizationPrompt).createdByUser
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(
                      (prompt as OrganizationPrompt).createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onCopy && (
              <Button variant="outline" size="sm" onClick={onCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Variables Overview */}
      {variables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="w-5 h-5" />
              Variables ({variables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => {
                const argDef = argumentsSchema[variable];
                const hasDefinition = !!argDef;

                return (
                  <div key={index} className="flex items-center gap-1">
                    <Badge
                      variant={hasDefinition ? "default" : "destructive"}
                      className="font-mono text-xs"
                    >
                      {`{{${variable}}}`}
                    </Badge>
                    {hasDefinition ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                );
              })}
            </div>

            {variables.some((v) => !argumentsSchema[v]) && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some variables are used in the template but not defined in the
                  arguments schema.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="w-5 h-5" />
              Template
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(templateContent, "Template")}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto border">
                {templateContent}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Arguments Schema */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Arguments Schema ({argumentEntries.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(argumentsSchema, null, 2),
                  "Arguments Schema"
                )
              }
            >
              <Copy className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {argumentEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No arguments defined</p>
                <p className="text-sm">
                  This prompt doesn&apos;t use any variables
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {argumentEntries.map(([name, config]) => {
                  const argConfig = config as ArgumentConfig;
                  return (
                    <div key={name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium font-mono text-sm">
                            {name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {argConfig.type || "string"}
                          </Badge>
                          {argConfig.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      {argConfig.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {argConfig.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {argConfig.default !== undefined && (
                          <div>
                            <span className="font-medium">Default: </span>
                            <code className="bg-muted px-1 rounded">
                              {JSON.stringify(argConfig.default)}
                            </code>
                          </div>
                        )}

                        {argConfig.placeholder && (
                          <div>
                            <span className="font-medium">Placeholder: </span>
                            <span className="text-muted-foreground">
                              {argConfig.placeholder}
                            </span>
                          </div>
                        )}

                        {argConfig.enum && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Options: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {argConfig.enum.map(
                                (option: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {option}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Example */}
      {variables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Usage Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This prompt uses the following variables. Make sure to provide
                values for all required variables:
              </p>

              <div className="bg-muted/50 p-3 rounded-lg">
                <h5 className="font-medium text-sm mb-2">
                  Required Variables:
                </h5>
                <div className="space-y-1">
                  {variables
                    .filter((v) => argumentsSchema[v]?.required)
                    .map((variable, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Badge
                          variant="destructive"
                          className="font-mono text-xs"
                        >
                          {`{{${variable}}}`}
                        </Badge>
                        <span className="text-muted-foreground">
                          {argumentsSchema[variable]?.description ||
                            "No description"}
                        </span>
                      </div>
                    ))}
                  {variables.filter((v) => argumentsSchema[v]?.required)
                    .length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      None - all variables are optional
                    </p>
                  )}
                </div>
              </div>

              {variables.filter(
                (v) => !argumentsSchema[v]?.required && argumentsSchema[v]
              ).length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">
                    Optional Variables:
                  </h5>
                  <div className="space-y-1">
                    {variables
                      .filter(
                        (v) =>
                          !argumentsSchema[v]?.required && argumentsSchema[v]
                      )
                      .map((variable, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {`{{${variable}}}`}
                          </Badge>
                          <span className="text-muted-foreground">
                            {argumentsSchema[variable]?.description ||
                              "No description"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
