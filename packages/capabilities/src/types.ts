import { z } from "zod";

// ============================================================================
// MCP SERVER SCHEMA & TYPES
// ============================================================================

export const MCPServerSchema = z.object({
  name: z.string(),
  port: z.number(),
  description: z.string(),
  productionUrl: z.string().url(),
  envVar: z.string(),
  isEnabled: z.boolean().default(true),
  tools: z.array(z.string()).min(1, "MCP servers must have at least one tool"),
  resources: z
    .array(z.string())
    .min(1, "MCP servers must have at least one resource"),
  prompts: z
    .array(z.string())
    .min(1, "MCP servers must have at least one prompt"),
});

export type MCPServerDefinition = z.infer<typeof MCPServerSchema>;
