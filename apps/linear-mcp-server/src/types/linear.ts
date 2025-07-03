// ============================================================================
// Linear MCP Server - TypeScript Types
// ============================================================================

export interface SearchIssuesInput {
  query?: string;
  teamId?: string;
  status?: string;
  assigneeId?: string;
  priority?: number;
  limit?: number;
}

export interface GetTeamsInput {
  includeArchived?: boolean;
  limit?: number;
}

export interface GetUsersInput {
  includeDisabled?: boolean;
  limit?: number;
}

export interface GetProjectsInput {
  teamId?: string;
  includeArchived?: boolean;
  limit?: number;
}

export interface GetIssueInput {
  issueId?: string;
  identifier?: string;
}

// Output types for Linear entities
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  priority: number;
  state?: string;
  team?: string;
  url: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
  private: boolean;
}

export interface LinearUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  active: boolean;
}

export interface LinearProject {
  id: string;
  name: string;
  state: string;
  lead?: string;
  teams: string;
}

export interface LinearIssueDetails {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  state?: string;
  assignee?: string;
  team?: string;
  project?: string;
  url: string;
}

// Response wrapper types
export interface SearchIssuesResponse {
  issues: LinearIssue[];
  count: number;
}

export interface GetTeamsResponse {
  teams: LinearTeam[];
  count: number;
}

export interface GetUsersResponse {
  users: LinearUser[];
  count: number;
}

export interface GetProjectsResponse {
  projects: LinearProject[];
  count: number;
}

// Simple prompt argument types (optional, for documentation)
export interface CreateIssueWorkflowArgs {
  teamId?: string;
  priority?: string;
}

export interface SprintPlanningArgs {
  teamId?: string;
  sprintDuration?: string;
}

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
