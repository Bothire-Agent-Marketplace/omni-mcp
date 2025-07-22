import { type ArgumentDefinition } from "@/components/arguments-schema-builder";

// Type definitions for JSON schema properties
interface JsonSchemaProperty {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  default?: string | number | boolean | object;
  placeholder?: string;
  enum?: string[];
}

export interface JsonSchema {
  [key: string]: JsonSchemaProperty;
}

/**
 * Convert visual argument definitions to JSON schema format
 */
export function argumentsToJsonSchema(
  argumentsDef: ArgumentDefinition[]
): JsonSchema {
  const schema: JsonSchema = {};

  argumentsDef.forEach((arg) => {
    if (!arg.name) return;

    const property: JsonSchemaProperty = {
      type: arg.type,
      description: arg.description,
    };

    // Add required field info
    if (arg.required) {
      property.required = true;
    }

    // Add default value
    if (arg.defaultValue !== undefined && arg.defaultValue !== "") {
      switch (arg.type) {
        case "number":
          property.default = parseFloat(arg.defaultValue) || undefined;
          break;
        case "boolean":
          property.default = arg.defaultValue === "true";
          break;
        case "array":
          try {
            property.default = JSON.parse(arg.defaultValue);
          } catch {
            // Invalid JSON, skip default
          }
          break;
        case "object":
          try {
            property.default = JSON.parse(arg.defaultValue);
          } catch {
            // Invalid JSON, skip default
          }
          break;
        default:
          property.default = arg.defaultValue;
      }
    }

    // Add placeholder as example
    if (arg.placeholder) {
      property.placeholder = arg.placeholder;
    }

    // Add enum options for string type
    if (arg.type === "string" && arg.options && arg.options.length > 0) {
      property.enum = arg.options.filter((option) => option.trim() !== "");
    }

    schema[arg.name] = property;
  });

  return schema;
}

/**
 * Convert JSON schema format to visual argument definitions
 */
export function jsonSchemaToArguments(
  schema: JsonSchema
): ArgumentDefinition[] {
  const argumentsDef: ArgumentDefinition[] = [];

  Object.entries(schema).forEach(([name, property]) => {
    if (typeof property !== "object" || property === null) return;

    const arg: ArgumentDefinition = {
      name,
      type: property.type || "string",
      required: Boolean(property.required),
      description: property.description || "",
      placeholder: property.placeholder || "",
    };

    // Convert default value to string for form handling
    if (property.default !== undefined) {
      if (typeof property.default === "object") {
        arg.defaultValue = JSON.stringify(property.default);
      } else {
        arg.defaultValue = String(property.default);
      }
    }

    // Add enum options for string type
    if (property.enum && Array.isArray(property.enum)) {
      arg.options = property.enum.map(String);
    }

    argumentsDef.push(arg);
  });

  return argumentsDef;
}

/**
 * Extract variables from a template string
 */
export function extractVariablesFromTemplate(template: string): string[] {
  const variableRegex = /\{\{(\s*\w+\s*)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    const variableName = match[1].trim();
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }

  return variables;
}

/**
 * Validate template against argument schema
 */
export function validateTemplate(
  template: string,
  argumentsSchema: ArgumentDefinition[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const variablesInTemplate = extractVariablesFromTemplate(template);
  const definedArguments = argumentsSchema
    .filter((arg) => arg.name)
    .map((arg) => arg.name);

  // Check for undefined variables
  variablesInTemplate.forEach((variable) => {
    if (!definedArguments.includes(variable)) {
      errors.push(
        `Variable '${variable}' is used in template but not defined in arguments`
      );
    }
  });

  // Check for unused arguments
  definedArguments.forEach((argName) => {
    if (!variablesInTemplate.includes(argName)) {
      warnings.push(
        `Argument '${argName}' is defined but not used in template`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
