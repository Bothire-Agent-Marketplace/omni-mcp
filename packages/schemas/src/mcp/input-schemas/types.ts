import { JSONSchemaProperty } from "../types.js";

// ============================================================================
// TOOL INPUT SCHEMA TYPE - Specific to MCP tool inputSchemas
// ============================================================================

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}
