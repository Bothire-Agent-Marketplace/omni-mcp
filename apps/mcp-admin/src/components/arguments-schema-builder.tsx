"use client";

import { Plus, Trash2, Move } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface ArgumentDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

interface ArgumentsSchemaBuilderProps {
  initialArguments?: ArgumentDefinition[];
  onChange: (argumentsSchema: ArgumentDefinition[]) => void;
  className?: string;
}

export function ArgumentsSchemaBuilder({
  initialArguments = [],
  onChange,
  className
}: ArgumentsSchemaBuilderProps) {
  const [argumentsState, setArgumentsState] =
  useState<ArgumentDefinition[]>(initialArguments);

  useEffect(() => {
    onChange(argumentsState);
  }, [argumentsState, onChange]);

  const addArgument = () => {
    const newArg: ArgumentDefinition = {
      name: "",
      type: "string",
      required: false,
      description: "",
      placeholder: ""
    };
    setArgumentsState([...argumentsState, newArg]);
  };

  const updateArgument = (
  index: number,
  updates: Partial<ArgumentDefinition>) =>
  {
    const updated = argumentsState.map((arg, i) =>
    i === index ? { ...arg, ...updates } : arg
    );
    setArgumentsState(updated);
  };

  const removeArgument = (index: number) => {
    setArgumentsState(argumentsState.filter((_, i) => i !== index));
  };








  const addEnumOption = (argIndex: number) => {
    const updated = [...argumentsState];
    const arg = updated[argIndex];
    if (!arg.options) arg.options = [];
    arg.options.push("");
    setArgumentsState(updated);
  };

  const updateEnumOption = (
  argIndex: number,
  optionIndex: number,
  value: string) =>
  {
    const updated = [...argumentsState];
    const arg = updated[argIndex];
    if (arg.options) {
      arg.options[optionIndex] = value;
      setArgumentsState(updated);
    }
  };

  const removeEnumOption = (argIndex: number, optionIndex: number) => {
    const updated = [...argumentsState];
    const arg = updated[argIndex];
    if (arg.options) {
      arg.options.splice(optionIndex, 1);
      if (arg.options.length === 0) {
        delete arg.options;
      }
      setArgumentsState(updated);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Arguments Schema</h4>
            <p className="text-sm text-muted-foreground">
              Define the variables that users can fill in this prompt template
            </p>
          </div>
          <Button onClick={addArgument} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Argument
          </Button>
        </div>

        {argumentsState.length === 0 &&
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground">
                <p>No arguments defined</p>
                <p className="text-sm mt-1">
                  Add arguments to make your prompt template dynamic
                </p>
              </div>
            </CardContent>
          </Card>
        }

        {argumentsState.map((arg, index) =>
        <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-muted-foreground cursor-move" />
                  <CardTitle className="text-base">
                    {arg.name || `Argument ${index + 1}`}
                  </CardTitle>
                  {arg.required &&
                <Badge variant="secondary" className="text-xs">
                      Required
                    </Badge>
                }
                  <Badge variant="outline" className="text-xs">
                    {arg.type}
                  </Badge>
                </div>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => removeArgument(index)}
                className="text-destructive hover:text-destructive">

                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {}
                <div className="space-y-2">
                  <Label>Variable Name</Label>
                  <Input
                  value={arg.name}
                  onChange={(e) =>
                  updateArgument(index, { name: e.target.value })
                  }
                  placeholder="e.g. userName, taskType"
                  className={!arg.name ? "border-destructive" : ""} />

                {!arg.name &&
                <p className="text-xs text-destructive">Name is required</p>
                }
                </div>

                {}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                  value={arg.type}
                  onValueChange={(value: ArgumentDefinition["type"]) =>
                  updateArgument(index, { type: value })
                  }>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Text (string)</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">True/False</SelectItem>
                      <SelectItem value="array">List (array)</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                value={arg.description}
                onChange={(e) =>
                updateArgument(index, { description: e.target.value })
                }
                placeholder="Explain what this argument is for and how it should be used"
                rows={2} />

              </div>

              <div className="grid grid-cols-2 gap-4">
                {}
                <div className="space-y-2">
                  <Label>Placeholder Text</Label>
                  <Input
                  value={arg.placeholder || ""}
                  onChange={(e) =>
                  updateArgument(index, { placeholder: e.target.value })
                  }
                  placeholder="e.g. Enter your name here" />

                </div>

                {}
                <div className="space-y-2">
                  <Label>Default Value</Label>
                  <Input
                  value={arg.defaultValue || ""}
                  onChange={(e) =>
                  updateArgument(index, { defaultValue: e.target.value })
                  }
                  placeholder="Optional default value" />

                </div>
              </div>

              {}
              <div className="flex items-center space-x-2">
                <Switch
                checked={arg.required}
                onCheckedChange={(checked) =>
                updateArgument(index, { required: checked })
                } />

                <Label>Required argument</Label>
              </div>

              {}
              {arg.type === "string" &&
            <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Predefined Options (Optional)</Label>
                        <p className="text-xs text-muted-foreground">
                          Create a dropdown with specific choices
                        </p>
                      </div>
                      <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addEnumOption(index)}>

                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </Button>
                    </div>

                    {arg.options && arg.options.length > 0 &&
                <div className="space-y-2">
                        {arg.options.map((option, optionIndex) =>
                  <div
                    key={optionIndex}
                    className="flex items-center gap-2">

                            <Input
                      value={option}
                      onChange={(e) =>
                      updateEnumOption(
                        index,
                        optionIndex,
                        e.target.value
                      )
                      }
                      placeholder={`Option ${optionIndex + 1}`}
                      className="flex-1" />

                            <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                      removeEnumOption(index, optionIndex)
                      }>

                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                  )}
                      </div>
                }
                  </div>
                </>
            }
            </CardContent>
          </Card>
        )}

        {argumentsState.length > 0 &&
        <div className="bg-muted/50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Template Usage</h5>
            <p className="text-sm text-muted-foreground mb-2">
              Use these variables in your template with double curly braces:
            </p>
            <div className="flex flex-wrap gap-2">
              {argumentsState.
            filter((arg) => arg.name).
            map((arg, index) =>
            <Badge key={index} variant="outline" className="font-mono">
                    {`{{${arg.name}}}`}
                  </Badge>
            )}
            </div>
          </div>
        }
      </div>
    </div>);

}