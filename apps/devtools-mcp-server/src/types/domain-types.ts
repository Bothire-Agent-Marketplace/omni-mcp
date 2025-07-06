// ============================================================================
// MCP Server - Domain-Specific TypeScript Types
// ============================================================================
// This file contains TypeScript types specific to the domain this MCP server serves.
// For Devtools: Items, Projects, etc.
// For future servers: Replace with relevant domain types (GitHub: Repos, Issues, PRs, etc.)

// Resource types - Update these for your specific domain
export interface DevtoolsItemResource {
  id: string;
  title: string;
  description?: string;
  uri: string;
  mimeType: string;
}

export interface DevtoolsProjectResource {
  id: string;
  name: string;
  description?: string;
  uri: string;
  mimeType: string;
}
