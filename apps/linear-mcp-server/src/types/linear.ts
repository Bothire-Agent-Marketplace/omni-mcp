// ============================================================================
// Linear MCP Server - TypeScript Types
// ============================================================================

interface SearchIssuesInput {
  query?: string;
  teamId?: string;
  status?: string;
  assigneeId?: string;
  priority?: number;
  limit?: number;
}

interface GetTeamsInput {
  includeArchived?: boolean;
  limit?: number;
}

interface GetUsersInput {
  includeDisabled?: boolean;
  limit?: number;
}

interface GetProjectsInput {
  teamId?: string;
  includeArchived?: boolean;
  limit?: number;
}

interface GetIssueInput {
  issueId?: string;
  identifier?: string;
}

// Output types for Linear entities
interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  priority: number;
  state?: string;
  team?: string;
  url: string;
}

interface LinearTeam {
  id: string;
  key: string;
  name: string;
  private: boolean;
}

interface LinearUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  active: boolean;
}

interface LinearProject {
  id: string;
  name: string;
  state: string;
  lead?: string;
  teams: string;
}

interface LinearIssueDetails {
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
interface SearchIssuesResponse {
  issues: LinearIssue[];
  count: number;
}

interface GetTeamsResponse {
  teams: LinearTeam[];
  count: number;
}

interface GetUsersResponse {
  users: LinearUser[];
  count: number;
}

interface GetProjectsResponse {
  projects: LinearProject[];
  count: number;
}

// Simple prompt argument types (optional, for documentation)
interface CreateIssueWorkflowArgs {
  teamId?: string;
  priority?: string;
}

interface SprintPlanningArgs {
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
