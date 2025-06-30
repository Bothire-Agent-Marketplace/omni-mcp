import { LinearClient } from "@linear/sdk";
import {
  McpResponse,
  SearchIssuesArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
} from "@mcp/schemas";

export class LinearTools {
  private client: LinearClient;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Linear API key is required");
    this.client = new LinearClient({ apiKey });
  }

  private async _execute<T = any>(
    toolName: string,
    logic: () => Promise<T>
  ): Promise<McpResponse<T>> {
    console.log(`Executing tool: ${toolName}`);
    try {
      const data = await logic();
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error in ${toolName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async linear_search_issues(args: Partial<SearchIssuesArgs> = {}) {
    return this._execute("linear_search_issues", async () => {
      const { query, teamId, status, assigneeId, priority, limit = 10 } = args;

      // Build the filter conditions
      const filter: any = {};

      if (teamId) {
        filter.team = { id: { eq: teamId } };
      }

      if (status) {
        filter.state = { name: { eq: status } };
      }

      if (assigneeId) {
        filter.assignee = { id: { eq: assigneeId } };
      }

      if (priority !== undefined) {
        filter.priority = { eq: priority };
      }

      // Perform the search
      const issues = await this.client.issues({
        filter,
        first: Math.min(limit, 50), // Cap at 50 for performance
      });

      // Format the response - need to await nested properties
      const formattedIssues = await Promise.all(
        issues.nodes.map(async (issue) => ({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          state: (await issue.state)?.name,
          assignee:
            (await issue.assignee)?.displayName || (await issue.assignee)?.name,
          team: (await issue.team)?.name,
          url: issue.url,
          createdAt: issue.createdAt.toISOString(),
          updatedAt: issue.updatedAt.toISOString(),
        }))
      );

      return {
        issues: formattedIssues,
        count: formattedIssues.length,
        query: args,
      };
    });
  }

  async linear_create_issue(args: CreateIssueArgs) {
    return this._execute("linear_create_issue", async () => {
      const {
        title,
        description,
        teamId,
        assigneeId,
        priority,
        labelIds,
        projectId,
        estimate,
      } = args;

      const issuePayload = await this.client.createIssue({
        title,
        description: description || "",
        teamId,
        assigneeId,
        priority: priority || undefined,
        labelIds,
        projectId,
        estimate,
      });

      const issue = await issuePayload.issue;
      if (!issue) throw new Error("Failed to create issue");

      return {
        id: issue.id,
        identifier: issue.identifier,
        url: issue.url,
        title: issue.title,
      };
    });
  }

  async linear_update_issue(args: UpdateIssueArgs) {
    return this._execute("linear_update_issue", async () => {
      const { issueId, ...updateFields } = args;
      const issuePayload = await this.client.updateIssue(issueId, updateFields);

      const issue = await issuePayload.issue;
      if (!issue) throw new Error("Failed to update issue");

      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: (await issue.state)?.name,
      };
    });
  }

  async linear_get_issue(args: { id: string }) {
    return this._execute("linear_get_issue", async () => {
      const issue = await this.client.issue(args.id);
      if (!issue) throw new Error(`Issue ${args.id} not found`);

      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        state: (await issue.state)?.name,
        assignee: (await issue.assignee)?.displayName,
        team: (await issue.team)?.name,
        url: issue.url,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
      };
    });
  }

  async linear_get_teams(args: { first?: number } = {}) {
    return this._execute("linear_get_teams", async () => {
      const teams = await this.client.teams({ first: args.first || 50 });

      return teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
        description: team.description,
      }));
    });
  }

  async linear_get_projects(args: { first?: number } = {}) {
    return this._execute("linear_get_projects", async () => {
      const projects = await this.client.projects({ first: args.first || 50 });

      return projects.nodes.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        url: project.url,
      }));
    });
  }

  async linear_get_workflow_states(args: { teamId?: string } = {}) {
    return this._execute("linear_get_workflow_states", async () => {
      const states = await this.client.workflowStates({
        filter: args.teamId ? { team: { id: { eq: args.teamId } } } : undefined,
      });

      return await Promise.all(
        states.nodes.map(async (state) => ({
          id: state.id,
          name: state.name,
          type: state.type,
          position: state.position,
          teamId: (await state.team)?.id,
        }))
      );
    });
  }

  async linear_comment_on_issue(args: { issueId: string; body: string }) {
    return this._execute("linear_comment_on_issue", async () => {
      const commentPayload = await this.client.createComment({
        issueId: args.issueId,
        body: args.body,
      });

      const comment = await commentPayload.comment;
      if (!comment) throw new Error("Failed to create comment");

      return {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      };
    });
  }

  async linear_get_sprint_issues(args: { sprintId: string }) {
    return this._execute("linear_get_sprint_issues", async () => {
      const cycle = await this.client.cycle(args.sprintId);
      if (!cycle) throw new Error(`Sprint ${args.sprintId} not found`);

      const issues = await cycle.issues();
      return issues.nodes.map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
      }));
    });
  }

  async linear_get_user(args: { id: string }) {
    return this._execute("linear_get_user", async () => {
      const user = await this.client.user(args.id);
      if (!user) throw new Error(`User ${args.id} not found`);

      return {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      };
    });
  }
}
