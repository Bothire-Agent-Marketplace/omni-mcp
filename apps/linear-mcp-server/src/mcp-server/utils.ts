import { Issue } from "@linear/sdk";

type LinearSortBy = "updated" | "created" | "priority";
type LinearSortOrder = "asc" | "desc";

interface LinearSearchParams {
  query?: string;
  teamId?: string;
  teamIds?: string[];
  stateId?: string;
  stateIds?: string[];
  status?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  labelIds?: string[];
  projectId?: string;
  cycleId?: string;
  includeArchived: boolean;
  priority?: number;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  limit: number;
  cursor?: string;
  sortBy: LinearSortBy;
  sortOrder: LinearSortOrder;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? (value.filter((v) => typeof v === "string") as string[])
    : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  return value === true ? true : value === false ? false : undefined;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseLinearSearchParams(raw: unknown): LinearSearchParams {
  const p = (raw as Record<string, unknown>) || {};

  const limit = clampNumber(Number(p.limit ?? 25), 1, 50);
  const sortBy: LinearSortBy =
    p.sortBy === "created" || p.sortBy === "updated" || p.sortBy === "priority"
      ? (p.sortBy as LinearSortBy)
      : "updated";
  const sortOrder: LinearSortOrder =
    p.sortOrder === "asc" || p.sortOrder === "desc"
      ? (p.sortOrder as LinearSortOrder)
      : "desc";

  return {
    query: toString(p.query),
    teamId: toString(p.teamId),
    teamIds: toStringArray(p.teamIds),
    stateId: toString(p.stateId),
    stateIds: toStringArray(p.stateIds),
    status: toString(p.status),
    assigneeId: toString(p.assigneeId),
    assigneeIds: toStringArray(p.assigneeIds),
    labelIds: toStringArray(p.labelIds),
    projectId: toString(p.projectId),
    cycleId: toString(p.cycleId),
    includeArchived: toBoolean(p.includeArchived) ?? false,
    priority: toNumber(p.priority),
    createdAtFrom: toString(p.createdAtFrom),
    createdAtTo: toString(p.createdAtTo),
    updatedAtFrom: toString(p.updatedAtFrom),
    updatedAtTo: toString(p.updatedAtTo),
    limit,
    cursor: toString(p.cursor),
    sortBy,
    sortOrder,
  };
}

export async function formatIssueWithRelations(issue: Issue): Promise<{
  id: string;
  identifier: string;
  title: string;
  priority: number | null;
  state?: string;
  team?: string;
  project?: string | null;
  cycle?: string | null;
  assignee?: string | null;
  updatedAt: string;
  createdAt: string;
  url: string;
  relatedIssues: Array<{
    relationType: string;
    identifier: string;
    title: string;
    team?: string;
    state?: string;
    url: string;
  }>;
}> {
  const [state, team, project, cycle, assignee] = await Promise.all([
    issue.state,
    issue.team,
    issue.project,
    issue.cycle,
    issue.assignee,
  ]);

  const relationsConnection = await issue.relations();
  const relatedList = await Promise.all(
    relationsConnection.nodes.map(async (relation) => {
      const relatedIssue = await relation.relatedIssue;
      if (!relatedIssue) return null;
      const [relatedTeam, relatedState] = await Promise.all([
        relatedIssue.team,
        relatedIssue.state,
      ]);
      return {
        relationType: relation.type,
        identifier: relatedIssue.identifier,
        title: relatedIssue.title,
        team: relatedTeam?.name,
        state: relatedState?.name,
        url: relatedIssue.url,
      };
    })
  );

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    priority: issue.priority,
    state: state?.name,
    team: team?.name,
    project: project?.name ?? null,
    cycle: cycle?.name ?? null,
    assignee: assignee?.name ?? null,
    updatedAt: issue.updatedAt.toISOString?.() ?? String(issue.updatedAt),
    createdAt: issue.createdAt.toISOString?.() ?? String(issue.createdAt),
    url: issue.url,
    relatedIssues: relatedList.filter(Boolean) as Array<{
      relationType: string;
      identifier: string;
      title: string;
      team?: string;
      state?: string;
      url: string;
    }>,
  };
}
