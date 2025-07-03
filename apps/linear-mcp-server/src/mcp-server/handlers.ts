import { LinearClient } from "@linear/sdk";
import { envConfig } from "@mcp/utils";
import type {
  SearchIssuesInput,
  GetTeamsInput,
  GetUsersInput,
  GetProjectsInput,
  GetIssueInput,
} from "../types/linear.js";

// Initialize a single, shared Linear client for all handlers
const apiKey = envConfig.LINEAR_API_KEY;
if (!apiKey) {
  throw new Error("LINEAR_API_KEY environment variable is required");
}
const linearClient = new LinearClient({ apiKey });

// ============================================================================
// HANDLER 1: Search Issues
// ============================================================================

export async function handleLinearSearchIssues(params: SearchIssuesInput) {
  const { teamId, status, assigneeId, priority, limit = 10 } = params;
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
