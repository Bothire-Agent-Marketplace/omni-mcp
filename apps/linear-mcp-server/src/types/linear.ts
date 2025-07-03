// ============================================================================
// Linear MCP Server - TypeScript Types
// ============================================================================

// Resource types
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
