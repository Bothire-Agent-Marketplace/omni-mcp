import { JSONSchemaProperty } from "../types.js";

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}
