import { ResourceDefinition } from "@mcp/schemas";
import { LINEAR_RESOURCES } from "../types/mcp-types.js";

// Use standardized resource definitions from server-specific types
// This ensures the Linear server owns its resource definitions
export const RESOURCES: readonly ResourceDefinition[] = LINEAR_RESOURCES;
