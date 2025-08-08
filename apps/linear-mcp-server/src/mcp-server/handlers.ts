import { LinearClient } from "@linear/sdk";

// Linear SDK Filter Types based on GraphQL API patterns
type FilterOperand<T> = { eq?: T; in?: T[] };
interface LinearIssueFilter {
  team?: { id?: FilterOperand<string> };
  teams?: { id?: { in: string[] } };
  state?: { id?: FilterOperand<string>; name?: FilterOperand<string> };
  assignee?: { id?: FilterOperand<string> };
  labels?: { some?: { id?: { in: string[] } } };
  project?: { id?: FilterOperand<string> };
  cycle?: { id?: FilterOperand<string> };
  archivedAt?: { null?: boolean };
  priority?: { eq?: number };
  createdAt?: { gte?: string; lte?: string };
  updatedAt?: { gte?: string; lte?: string };
}

interface LinearUserFilter {
  active?: { eq: boolean };
}

// LinearProjectFilter removed - using Record<string, unknown> for complex filtering

// ============================================================================
// HANDLER 1: Search Issues
// ============================================================================

export async function handleLinearSearchIssues(
  linearClient: LinearClient,
  params: unknown
) {
  const p = (params as Record<string, unknown>) || {};
  const query = typeof p.query === "string" ? p.query : undefined;
  const teamId = typeof p.teamId === "string" ? p.teamId : undefined;
  const teamIds = Array.isArray(p.teamIds)
    ? (p.teamIds as string[])
    : undefined;
  const stateId = typeof p.stateId === "string" ? p.stateId : undefined;
  const stateIds = Array.isArray(p.stateIds)
    ? (p.stateIds as string[])
    : undefined;
  const status = typeof p.status === "string" ? p.status : undefined;
  const assigneeId =
    typeof p.assigneeId === "string" ? p.assigneeId : undefined;
  const assigneeIds = Array.isArray(p.assigneeIds)
    ? (p.assigneeIds as string[])
    : undefined;
  const labelIds = Array.isArray(p.labelIds)
    ? (p.labelIds as string[])
    : undefined;
  const projectId = typeof p.projectId === "string" ? p.projectId : undefined;
  const cycleId = typeof p.cycleId === "string" ? p.cycleId : undefined;
  const includeArchived = p.includeArchived === true;
  const priority =
    typeof p.priority === "number" ? (p.priority as number) : undefined;
  const createdAtFrom =
    typeof p.createdAtFrom === "string"
      ? (p.createdAtFrom as string)
      : undefined;
  const createdAtTo =
    typeof p.createdAtTo === "string" ? (p.createdAtTo as string) : undefined;
  const updatedAtFrom =
    typeof p.updatedAtFrom === "string"
      ? (p.updatedAtFrom as string)
      : undefined;
  const updatedAtTo =
    typeof p.updatedAtTo === "string" ? (p.updatedAtTo as string) : undefined;
  const limit = Math.min(Math.max(Number(p.limit ?? 25), 1), 50);
  const cursor =
    typeof p.cursor === "string" ? (p.cursor as string) : undefined;
  const _sortBy =
    p.sortBy === "created" || p.sortBy === "updated" || p.sortBy === "priority"
      ? (p.sortBy as "created" | "updated" | "priority")
      : "updated";
  const _sortOrder =
    p.sortOrder === "asc" || p.sortOrder === "desc"
      ? (p.sortOrder as "asc" | "desc")
      : "desc";

  const filter: LinearIssueFilter = {};
  if (teamId) filter.team = { id: { eq: teamId } };
  if (teamIds && teamIds.length > 0) filter.teams = { id: { in: teamIds } };

  if (stateId) filter.state = { ...(filter.state || {}), id: { eq: stateId } };
  if (stateIds && stateIds.length > 0)
    filter.state = { ...(filter.state || {}), id: { in: stateIds } };
  if (status) filter.state = { ...(filter.state || {}), name: { eq: status } };

  if (assigneeId)
    filter.assignee = { ...(filter.assignee || {}), id: { eq: assigneeId } };
  if (assigneeIds && assigneeIds.length > 0)
    filter.assignee = { ...(filter.assignee || {}), id: { in: assigneeIds } };

  if (labelIds && labelIds.length > 0)
    filter.labels = { some: { id: { in: labelIds } } };
  if (projectId) filter.project = { id: { eq: projectId } };
  if (cycleId) filter.cycle = { id: { eq: cycleId } };

  if (!includeArchived) filter.archivedAt = { null: true };
  if (priority !== undefined) filter.priority = { eq: priority };

  if (createdAtFrom || createdAtTo) {
    filter.createdAt = {
      ...(createdAtFrom ? { gte: createdAtFrom } : {}),
      ...(createdAtTo ? { lte: createdAtTo } : {}),
    };
  }
  if (updatedAtFrom || updatedAtTo) {
    filter.updatedAt = {
      ...(updatedAtFrom ? { gte: updatedAtFrom } : {}),
      ...(updatedAtTo ? { lte: updatedAtTo } : {}),
    };
  }

  // Identifier detection: ENG-123 style, or numeric number
  const identifierMatch = query?.match(/^[A-Za-z]+-\d+$/);
  const numberMatch = query?.match(/^\d+$/);

  // Execute query with optional cursor and full-text fallback
  const issues = await linearClient.issues({
    filter,
    first: Math.min(limit, 50),
    ...(cursor ? { after: cursor } : {}),
    ...(identifierMatch || numberMatch
      ? { query } // Linear supports identifier/number in query for exact match
      : query
        ? { query } // free-text
        : {}),
  });

  const formattedIssues = await Promise.all(
    issues.nodes.map(async (issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority,
      state: (await issue.state)?.name,
      team: (await issue.team)?.name,
      project: (await issue.project)?.name,
      cycle: (await issue.cycle)?.name,
      assignee: (await issue.assignee)?.name,
      updatedAt: issue.updatedAt,
      createdAt: issue.createdAt,
      url: issue.url,
    }))
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            issues: formattedIssues,
            count: formattedIssues.length,
            pageInfo: {
              hasNextPage: issues.pageInfo.hasNextPage,
              endCursor: issues.pageInfo.endCursor,
            },
          },
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

export async function handleLinearGetTeams(
  linearClient: LinearClient,
  params: unknown
) {
  const p = (params as Record<string, unknown>) || {};
  const includeArchived = p.includeArchived === true;
  const limit = Math.min(Math.max(Number(p.limit ?? 20), 1), 100);

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

export async function handleLinearGetUsers(
  linearClient: LinearClient,
  params: unknown
) {
  const p = (params as Record<string, unknown>) || {};
  const includeDisabled = p.includeDisabled === true;
  const limit = Math.min(Math.max(Number(p.limit ?? 20), 1), 100);

  const filter: LinearUserFilter = {};
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

export async function handleLinearGetProjects(
  linearClient: LinearClient,
  params: unknown
) {
  const p = (params as Record<string, unknown>) || {};
  const teamId = typeof p.teamId === "string" ? p.teamId : undefined;
  const includeArchived = p.includeArchived === true;
  const limit = Math.min(Math.max(Number(p.limit ?? 20), 1), 50);

  const filter: Record<string, unknown> = {};
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

export async function handleLinearGetIssue(
  linearClient: LinearClient,
  params: unknown
) {
  const p = (params as Record<string, unknown>) || {};
  const issueId =
    typeof p.issueId === "string" ? (p.issueId as string) : undefined;
  const identifier =
    typeof p.identifier === "string" ? (p.identifier as string) : undefined;

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
