import { LinearClient } from "@linear/sdk";
import { z } from "zod";
import { envConfig } from "@mcp/utils";

// Initialize a single, shared Linear client for all handlers
const apiKey = envConfig.LINEAR_API_KEY;
if (!apiKey) {
  throw new Error("LINEAR_API_KEY environment variable is required");
}
const linearClient = new LinearClient({ apiKey });

// ============================================================================
// HANDLER 1: Search Issues
// ============================================================================

export const SearchIssuesInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Text to search in issue titles and descriptions"),
  teamId: z.string().optional().describe("Filter by team ID"),
  status: z.string().optional().describe("Filter by issue status/state name"),
  assigneeId: z.string().optional().describe("Filter by assignee user ID"),
  priority: z
    .number()
    .min(0)
    .max(4)
    .optional()
    .describe(
      "Filter by priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)"
    ),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of issues to return"),
});
type SearchIssuesInput = z.infer<typeof SearchIssuesInputSchema>;

export async function handleLinearSearchIssues(params: SearchIssuesInput) {
  const { query, teamId, status, assigneeId, priority, limit = 10 } = params;
  const filter: any = {};
  if (teamId) filter.team = { id: { eq: teamId } };
  if (status) filter.state = { name: { eq: status } };
  if (assigneeId) filter.assignee = { id: { eq: assigneeId } };
  if (priority !== undefined) filter.priority = { eq: priority };

  const issues = await linearClient.issues({
    filter,
    first: Math.min(limit, 50),
  });

  const formattedIssues = await Promise.all(
    issues.nodes.map(async (issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority,
      state: (await issue.state)?.name,
      team: (await issue.team)?.name,
      url: issue.url,
    }))
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { issues: formattedIssues, count: formattedIssues.length },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// HANDLER 2: Get Teams
// ============================================================================

export const GetTeamsInputSchema = z.object({
  includeArchived: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include archived teams in results"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of teams to return"),
});
type GetTeamsInput = z.infer<typeof GetTeamsInputSchema>;

export async function handleLinearGetTeams(params: GetTeamsInput) {
  const { includeArchived = false, limit = 20 } = params;
  const teams = await linearClient.teams({
    includeArchived,
    first: Math.min(limit, 100),
  });

  const formattedTeams = teams.nodes.map((team) => ({
    id: team.id,
    key: team.key,
    name: team.name,
    private: team.private,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { teams: formattedTeams, count: formattedTeams.length },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// HANDLER 3: Get Users
// ============================================================================

export const GetUsersInputSchema = z.object({
  includeDisabled: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include disabled users in results"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of users to return"),
});
type GetUsersInput = z.infer<typeof GetUsersInputSchema>;

export async function handleLinearGetUsers(params: GetUsersInput) {
  const { includeDisabled = false, limit = 20 } = params;
  const filter: any = {};
  if (!includeDisabled) {
    filter.active = { eq: true };
  }

  const users = await linearClient.users({
    filter,
    first: Math.min(limit, 100),
  });

  const formattedUsers = users.nodes.map((user) => ({
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    active: user.active,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { users: formattedUsers, count: formattedUsers.length },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// HANDLER 4: Get Projects
// ============================================================================

export const GetProjectsInputSchema = z.object({
  teamId: z.string().optional().describe("Filter projects by team"),
  includeArchived: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include archived projects"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of projects to return"),
});
type GetProjectsInput = z.infer<typeof GetProjectsInputSchema>;

export async function handleLinearGetProjects(params: GetProjectsInput) {
  const { teamId, includeArchived = false, limit = 20 } = params;
  const filter: any = {};
  if (teamId) filter.teams = { some: { id: { eq: teamId } } };
  if (!includeArchived) filter.archivedAt = { null: true };

  const projects = await linearClient.projects({
    filter,
    first: Math.min(limit, 50),
  });

  const formattedProjects = await Promise.all(
    projects.nodes.map(async (project) => ({
      id: project.id,
      name: project.name,
      state: project.state,
      lead: (await project.lead)?.name,
      teams: (await project.teams()).nodes.map((t) => t.key).join(", "),
    }))
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { projects: formattedProjects, count: formattedProjects.length },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// HANDLER 5: Get Issue Details
// ============================================================================

export const GetIssueInputSchema = z.object({
  issueId: z
    .string()
    .optional()
    .describe("Issue ID (either issueId or identifier required)"),
  identifier: z
    .string()
    .optional()
    .describe(
      "Issue identifier like 'TEAM-123' (either issueId or identifier required)"
    ),
});
type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

export async function handleLinearGetIssue(params: GetIssueInput) {
  const { issueId, identifier } = params;
  let issue;

  if (issueId) {
    issue = await linearClient.issue(issueId);
  } else if (identifier) {
    const match = identifier.match(/^[a-zA-Z]+-(\d+)$/);
    const issueNumber = match ? parseInt(match[1], 10) : undefined;

    if (issueNumber === undefined) {
      throw new Error(`Invalid issue identifier format: ${identifier}`);
    }

    const issues = await linearClient.issues({
      filter: { number: { eq: issueNumber } },
    });
    issue = issues.nodes[0];
  } else {
    throw new Error("Either issueId or identifier must be provided");
  }

  if (!issue) {
    throw new Error(`Issue not found: ${issueId || identifier}`);
  }

  const [state, assignee, team, project] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.team,
    issue.project,
  ]);

  const formattedIssue = {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    state: state?.name,
    assignee: assignee?.name,
    team: team?.name,
    project: project?.name,
    url: issue.url,
  };

  return {
    content: [
      { type: "text" as const, text: JSON.stringify(formattedIssue, null, 2) },
    ],
  };
}
