import { LinearClient } from "@linear/sdk";
import { formatIssueWithRelations, parseLinearSearchParams } from "./utils.js";

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

export async function handleLinearSearchIssues(
  linearClient: LinearClient,
  params: unknown
) {
  const parsed = parseLinearSearchParams(params);
  const {
    query,
    teamId,
    teamIds,
    stateId,
    stateIds,
    status,
    assigneeId,
    assigneeIds,
    labelIds,
    projectId,
    cycleId,
    includeArchived,
    priority,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    limit,
    cursor,
  } = parsed;

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

  const identifierMatch = query?.match(/^[A-Za-z]+-\d+$/);
  const numberMatch = query?.match(/^\d+$/);

  const issues = await linearClient.issues({
    filter,
    first: Math.min(limit, 50),
    ...(cursor ? { after: cursor } : {}),
    ...(identifierMatch || numberMatch ? { query } : query ? { query } : {}),
  });

  const formattedIssues = await Promise.all(
    issues.nodes.map((issue) => formatIssueWithRelations(issue))
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

  const formattedIssue = await formatIssueWithRelations(issue);

  return {
    content: [
      { type: "text" as const, text: JSON.stringify(formattedIssue, null, 2) },
    ],
  };
}
