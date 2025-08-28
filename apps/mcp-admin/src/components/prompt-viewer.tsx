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
  MessageSquare,
  Hash } from
"lucide-react";
import { toast } from "sonner";
import type { OrganizationPrompt, DefaultPrompt } from "@/types/prompts";
import { extractVariablesFromTemplate } from "@/lib/prompt-utils";


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
  onDelete
}: PromptViewerProps) {
  const isCustomPrompt = "version" in prompt && "createdByUser" in prompt;

  const templateContent = (() => {
    if (typeof prompt.template === "string") {
      return prompt.template;
    } else if (Array.isArray(prompt.template)) {

      return prompt.template.
      map((item) => {
        if (item && typeof item === "object" && "content" in item) {
          return (item as {content: string;}).content;
        }
        return JSON.stringify(item);
      }).
      join("\n\n");
    } else if (
    typeof prompt.template === "object" &&
    prompt.template !== null)
    {

      const templateObj = prompt.template as Record<string, unknown>;

      if ("message" in templateObj && typeof templateObj.message === "string") {
        return templateObj.message;
      }

      return JSON.stringify(templateObj, null, 2);
    } else {
      return JSON.stringify(prompt.template, null, 2);
    }
  })();

  const variables = extractVariablesFromTemplate(templateContent);

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
  } | null) =>
  {
    if (!user) return "System";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {}
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground">
              {prompt.name}
            </h2>
            {isCustomPrompt &&
            <>
                <Badge variant="secondary">
                  v{(prompt as OrganizationPrompt).version}
                </Badge>
                <Badge variant="outline">Custom</Badge>
              </>
            }
            {!isCustomPrompt && <Badge variant="secondary">Default</Badge>}
          </div>
          <p className="text-muted-foreground text-lg">{prompt.description}</p>

          {}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Server className="w-4 h-4" />
              <span>{prompt.mcpServer.name}</span>
            </div>

            {isCustomPrompt &&
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
            }
          </div>
        </div>

        {}
        {showActions &&
        <div className="flex items-center gap-2">
            {onEdit &&
          <Button variant="outline" size="sm" onClick={onEdit}>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </Button>
          }
            {onCopy &&
          <Button variant="outline" size="sm" onClick={onCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
          }
          </div>
        }
      </div>

      {}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Prompt Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap break-words">
              {templateContent}
            </pre>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(templateContent, "Template")}
            className="w-fit">

            <Copy className="w-4 h-4 mr-2" />
            Copy Template
          </Button>
        </CardContent>
      </Card>

      {}
      {variables.length > 0 &&
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Template Variables
              <Badge variant="outline" className="text-xs">
                {variables.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {variables.map((variable, index) =>
            <div
              key={index}
              className="bg-muted rounded-lg p-3 font-mono text-sm">

                  <code className="text-primary">{`{{${variable}}}`}</code>
                </div>
            )}
            </div>
          </CardContent>
        </Card>
      }

      {}
      {argumentEntries.length > 0 &&
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              Arguments Schema
              <Badge variant="outline" className="text-xs">
                {argumentEntries.length} parameters
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {argumentEntries.map(([key, config]) =>
            <div
              key={key}
              className="border rounded-lg p-4 space-y-3 bg-card">

                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground">{key}</h4>
                    {config.type &&
                <Badge variant="outline" className="text-xs font-mono">
                        {config.type}
                      </Badge>
                }
                    {config.required &&
                <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                }
                  </div>

                  {config.description &&
              <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
              }

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {config.default !== undefined &&
                <div>
                        <span className="font-medium text-muted-foreground">
                          Default:
                        </span>
                        <code className="ml-1 bg-muted px-1 rounded">
                          {JSON.stringify(config.default)}
                        </code>
                      </div>
                }
                    {config.placeholder &&
                <div>
                        <span className="font-medium text-muted-foreground">
                          Placeholder:
                        </span>
                        <span className="ml-1 text-muted-foreground">
                          {config.placeholder}
                        </span>
                      </div>
                }
                    {config.enum &&
                <div className="md:col-span-2">
                        <span className="font-medium text-muted-foreground">
                          Options:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.enum.map((option, idx) =>
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs">

                              {option}
                            </Badge>
                    )}
                        </div>
                      </div>
                }
                  </div>
                </div>
            )}
            </div>
          </CardContent>
        </Card>
      }

      {}
      {isCustomPrompt &&
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Prompt Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  ID
                </div>
                <div className="font-mono text-sm bg-muted rounded px-2 py-1 break-all">
                  {(prompt as OrganizationPrompt).id}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Version
                </div>
                <div className="text-sm">
                  v{(prompt as OrganizationPrompt).version}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  MCP Server
                </div>
                <div className="text-sm">{prompt.mcpServer.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">
                  {new Date(
                  (prompt as OrganizationPrompt).createdAt
                ).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Updated
                </div>
                <div className="text-sm">
                  {new Date(
                  (prompt as OrganizationPrompt).updatedAt
                ).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    </div>);

}