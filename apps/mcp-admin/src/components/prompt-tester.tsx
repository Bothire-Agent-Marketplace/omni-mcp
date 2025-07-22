"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Copy, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { ArgumentDefinition } from "./arguments-schema-builder";

interface PromptTesterProps {
  template: string;
  argumentsSchema: ArgumentDefinition[];
  className?: string;
}

interface VariableValues {
  [key: string]: string | number | boolean | object | unknown[];
}

export function PromptTester({
  template,
  argumentsSchema,
  className,
}: PromptTesterProps) {
  const [variableValues, setVariableValues] = useState<VariableValues>({});
  const [renderedPrompt, setRenderedPrompt] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Initialize variable values with defaults
  useEffect(() => {
    const initialValues: VariableValues = {};
    argumentsSchema.forEach((arg) => {
      if (arg.name) {
        if (arg.defaultValue !== undefined) {
          switch (arg.type) {
            case "number":
              initialValues[arg.name] = parseFloat(arg.defaultValue) || 0;
              break;
            case "boolean":
              initialValues[arg.name] = arg.defaultValue === "true";
              break;
            case "array":
              try {
                initialValues[arg.name] = JSON.parse(arg.defaultValue);
              } catch {
                initialValues[arg.name] = [];
              }
              break;
            case "object":
              try {
                initialValues[arg.name] = JSON.parse(arg.defaultValue);
              } catch {
                initialValues[arg.name] = {};
              }
              break;
            default:
              initialValues[arg.name] = arg.defaultValue;
          }
        } else {
          // Set type-appropriate empty values
          switch (arg.type) {
            case "number":
              initialValues[arg.name] = 0;
              break;
            case "boolean":
              initialValues[arg.name] = false;
              break;
            case "array":
              initialValues[arg.name] = "";
              break;
            case "object":
              initialValues[arg.name] = "";
              break;
            default:
              initialValues[arg.name] = "";
          }
        }
      }
    });
    setVariableValues(initialValues);
  }, [argumentsSchema]);

  // Render the prompt with current variable values
  useEffect(() => {
    const errors: string[] = [];
    let rendered = template;

    // Validate required fields
    argumentsSchema.forEach((arg) => {
      if (arg.required && arg.name) {
        const value = variableValues[arg.name];
        if (value === undefined || value === "" || value === null) {
          errors.push(`${arg.name} is required`);
        }
      }
    });

    // Replace variables in template
    const variableRegex = /\{\{(\s*\w+\s*)\}\}/g;
    rendered = rendered.replace(variableRegex, (match, variableName) => {
      const cleanName = variableName.trim();
      const value = variableValues[cleanName];

      if (value === undefined || value === null) {
        errors.push(`Variable ${cleanName} is not defined`);
        return `{{${cleanName}}}`;
      }

      // Convert value to string for rendering
      if (typeof value === "object") {
        return JSON.stringify(value);
      }

      return String(value);
    });

    setRenderedPrompt(rendered);
    setErrors(errors);
    setIsValid(errors.length === 0);
  }, [template, variableValues, argumentsSchema]);

  const updateVariableValue = (
    name: string,
    value: string | number | boolean
  ) => {
    setVariableValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetValues = () => {
    const resetValues: VariableValues = {};
    argumentsSchema.forEach((arg) => {
      if (arg.name) {
        switch (arg.type) {
          case "number":
            resetValues[arg.name] = 0;
            break;
          case "boolean":
            resetValues[arg.name] = false;
            break;
          default:
            resetValues[arg.name] = "";
        }
      }
    });
    setVariableValues(resetValues);
  };

  const copyRenderedPrompt = () => {
    if (renderedPrompt) {
      navigator.clipboard.writeText(renderedPrompt);
      toast.success("Prompt copied to clipboard!");
    }
  };

  const executePrompt = () => {
    if (isValid) {
      // Here you could integrate with actual MCP server execution
      toast.success("Prompt is valid and ready to execute!");
      // Execute the prompt with the rendered template
    }
  };

  if (argumentsSchema.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-muted-foreground">
              <p>No arguments defined</p>
              <p className="text-sm mt-1">
                Add arguments to enable prompt testing
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Prompt Tester</h4>
            <p className="text-sm text-muted-foreground">
              Fill in the variables to test how your prompt will look
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetValues}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={executePrompt}
              size="sm"
              disabled={!isValid}
              className={isValid ? "" : ""}
            >
              <Play className="w-4 h-4 mr-2" />
              Test Prompt
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variable Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {argumentsSchema.map((arg, index) => {
                if (!arg.name) return null;

                const value = variableValues[arg.name];
                const hasError =
                  arg.required &&
                  (value === undefined || value === "" || value === null);

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={`var-${arg.name}`}
                        className="flex items-center gap-2"
                      >
                        {arg.name}
                        {arg.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {arg.type}
                      </Badge>
                    </div>

                    {arg.description && (
                      <p className="text-xs text-muted-foreground">
                        {arg.description}
                      </p>
                    )}

                    {/* String input with enum options */}
                    {arg.type === "string" &&
                    arg.options &&
                    arg.options.length > 0 ? (
                      <Select
                        value={String(value || "")}
                        onValueChange={(newValue) =>
                          updateVariableValue(arg.name, newValue)
                        }
                      >
                        <SelectTrigger
                          className={hasError ? "border-destructive" : ""}
                        >
                          <SelectValue
                            placeholder={arg.placeholder || "Select an option"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {arg.options.map((option, optionIndex) => (
                            <SelectItem key={optionIndex} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : /* Regular string input */
                    arg.type === "string" ? (
                      <Textarea
                        id={`var-${arg.name}`}
                        value={String(value || "")}
                        onChange={(e) =>
                          updateVariableValue(arg.name, e.target.value)
                        }
                        placeholder={arg.placeholder || `Enter ${arg.name}`}
                        rows={2}
                        className={hasError ? "border-destructive" : ""}
                      />
                    ) : /* Number input */
                    arg.type === "number" ? (
                      <Input
                        id={`var-${arg.name}`}
                        type="number"
                        value={Number(value || 0)}
                        onChange={(e) =>
                          updateVariableValue(
                            arg.name,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder={arg.placeholder || `Enter ${arg.name}`}
                        className={hasError ? "border-destructive" : ""}
                      />
                    ) : /* Boolean input */
                    arg.type === "boolean" ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={Boolean(value)}
                          onCheckedChange={(checked) =>
                            updateVariableValue(arg.name, checked)
                          }
                        />
                        <Label>{Boolean(value) ? "True" : "False"}</Label>
                      </div>
                    ) : /* Array/Object input */
                    arg.type === "array" || arg.type === "object" ? (
                      <Textarea
                        id={`var-${arg.name}`}
                        value={String(value || "")}
                        onChange={(e) =>
                          updateVariableValue(arg.name, e.target.value)
                        }
                        placeholder={
                          arg.type === "array"
                            ? '["item1", "item2"]'
                            : '{"key": "value"}'
                        }
                        rows={3}
                        className={`font-mono text-sm ${hasError ? "border-destructive" : ""}`}
                      />
                    ) : null}

                    {hasError && (
                      <p className="text-xs text-destructive">
                        This field is required
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Rendered Output */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Rendered Prompt</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={copyRenderedPrompt}
                disabled={!isValid}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              {errors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Validation errors:</p>
                      {errors.map((error, index) => (
                        <p key={index} className="text-sm">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isValid && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Prompt is valid and ready to use!
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-4 rounded-md">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {renderedPrompt ||
                    "Enter values for variables to see the rendered prompt"}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
