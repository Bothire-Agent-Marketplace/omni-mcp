// ============================================================================
// MCP Server - Domain-Specific TypeScript Types
// ============================================================================
// This file contains TypeScript types specific to the domain this MCP server serves.
// For Linear: Teams, Users, Issues, Projects, etc.
// For future servers: Replace with relevant domain types (GitHub: Repos, Issues, PRs, etc.)

// Resource types - Update these for your specific domain
export interface LinearTeamResource {
  id: string;
  name: string;
  key: string;
  description?: string;
}

export interface LinearUserResource {
  id: string;
  name: string;
  displayName: string;
  email: string;
  active: boolean;
}
