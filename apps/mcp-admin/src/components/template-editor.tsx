"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ArgumentDefinition } from "./arguments-schema-builder";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  argumentsSchema?: ArgumentDefinition[];
  placeholder?: string;
  label?: string;
  description?: string;
  rows?: number;
  className?: string;
}

interface VariableValidation {
  variable: string;
  isValid: boolean;
  reason?: string;
}

export function TemplateEditor({
  value,
  onChange,
  argumentsSchema = [],
  placeholder = "Enter your prompt template...",
  label = "Template",
  description,
  rows = 6,
  className
}: TemplateEditorProps) {
  const [variables, setVariables] = useState<string[]>([]);
  const [validations, setValidations] = useState<VariableValidation[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const variableRegex = /\{\{(\s*\w+\s*)\}\}/g;
    const foundVariables: string[] = [];
    let match;

    while ((match = variableRegex.exec(value)) !== null) {
      const variableName = match[1].trim();
      if (!foundVariables.includes(variableName)) {
        foundVariables.push(variableName);
      }
    }

    setVariables(foundVariables);
  }, [value]);

  useEffect(() => {
    const validations: VariableValidation[] = variables.map((variable) => {
      const argDef = argumentsSchema.find((arg) => arg.name === variable);

      if (!argDef) {
        return {
          variable,
          isValid: false,
          reason: "Not defined in arguments schema"
        };
      }

      if (!argDef.name) {
        return {
          variable,
          isValid: false,
          reason: "Argument name is empty"
        };
      }

      return {
        variable,
        isValid: true
      };
    });


    const usedVariables = variables;
    argumentsSchema.forEach((arg) => {
      if (arg.name && !usedVariables.includes(arg.name)) {
        validations.push({
          variable: arg.name,
          isValid: true,
          reason: "Defined but not used in template"
        });
      }
    });

    setValidations(validations);
  }, [variables, argumentsSchema]);

  const handleTemplateChange = (newValue: string) => {
    onChange(newValue);
  };

  const insertVariable = (variableName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;

    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    const variableText = `{{${variableName}}}`;

    const newValue = before + variableText + after;
    onChange(newValue);


    setTimeout(() => {
      const newPosition = start + variableText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const invalidVariables = validations.filter(
    (v) => !v.isValid && variables.includes(v.variable)
  );
  const unusedArguments = validations.filter(
    (v) => v.reason === "Defined but not used in template"
  );
  const hasErrors = invalidVariables.length > 0;

  return (
    <div className={className}>
      <div className="space-y-4">
        {}
        <div>
          <Label>{label}</Label>
          {description &&
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          }
        </div>

        {}
        {argumentsSchema.length > 0 &&
        <div className="bg-muted/50 p-3 rounded-lg">
            <h5 className="text-sm font-medium mb-2">Available Variables</h5>
            <div className="flex flex-wrap gap-2">
              {argumentsSchema.
            filter((arg) => arg.name).
            map((arg, index) => {
              const isUsed = variables.includes(arg.name);
              return (
                <Badge
                  key={index}
                  variant={isUsed ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent font-mono text-xs"
                  onClick={() => insertVariable(arg.name)}
                  title={`${arg.description || "No description"} (${arg.type}${arg.required ? ", required" : ""})`}>

                      {`{{${arg.name}}}`}
                    </Badge>);

            })}
              {argumentsSchema.length === 0 &&
            <p className="text-sm text-muted-foreground">
                  Define arguments to see available variables
                </p>
            }
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click on any variable above to insert it at cursor position
            </p>
          </div>
        }

        {}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleTemplateChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`font-mono text-sm resize-vertical ${hasErrors ? "border-destructive" : ""}`} />

        </div>

        {}
        {hasErrors &&
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Template validation errors:</p>
                {invalidVariables.map((validation, index) =>
              <p key={index} className="text-sm">
                    • Variable{" "}
                    <code className="bg-destructive/20 px-1 rounded">
                      {`{{${validation.variable}}}`}
                    </code>
                    : {validation.reason}
                  </p>
              )}
              </div>
            </AlertDescription>
          </Alert>
        }

        {}
        {unusedArguments.length > 0 && !hasErrors &&
        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Unused arguments:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {unusedArguments.map((validation, index) =>
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent font-mono text-xs"
                  onClick={() => insertVariable(validation.variable)}>

                      {`{{${validation.variable}}}`}
                    </Badge>
                )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on unused variables to insert them into your template
                </p>
              </div>
            </AlertDescription>
          </Alert>
        }

        {}
        {!hasErrors && variables.length > 0 && unusedArguments.length === 0 &&
        <Alert className="border-green-200 bg-green-50/50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Template is valid! All variables are properly defined.
            </AlertDescription>
          </Alert>
        }

        {}
        {variables.length > 0 &&
        <div className="bg-muted/50 border p-3 rounded-lg">
            <h5 className="text-sm font-medium text-foreground mb-2">
              Variables in Template ({variables.length})
            </h5>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => {
              const validation = validations.find(
                (v) => v.variable === variable
              );
              const isValid = validation?.isValid !== false;

              return (
                <Badge
                  key={index}
                  variant={isValid ? "default" : "destructive"}
                  className="font-mono text-xs">

                    {`{{${variable}}}`}
                  </Badge>);

            })}
            </div>
          </div>
        }
      </div>
    </div>);

}