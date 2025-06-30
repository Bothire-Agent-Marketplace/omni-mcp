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
    if (!apiKey) {
      throw new Error("Linear API key is required");
    }
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
      // TODO: Implement actual logic
      return { message: "Create issue not implemented", args };
    });
  }

  async linear_update_issue(args: UpdateIssueArgs) {
    return this._execute("linear_update_issue", async () => {
      // TODO: Implement actual logic
      return { message: "Update issue not implemented", args };
    });
  }

  async linear_get_issue(args: any) {
    return this._execute("linear_get_issue", async () => {
      // TODO: Implement actual logic
      return { message: "Get issue not implemented", args };
    });
  }

  async linear_get_teams(args: any) {
    return this._execute("linear_get_teams", async () => {
      // TODO: Implement actual logic
      return { message: "Get teams not implemented", args };
    });
  }

  async linear_get_projects(args: any) {
    return this._execute("linear_get_projects", async () => {
      // TODO: Implement actual logic
      return { message: "Get projects not implemented", args };
    });
  }

  async linear_get_workflow_states(args: any) {
    return this._execute("linear_get_workflow_states", async () => {
      // TODO: Implement actual logic
      return { message: "Get workflow states not implemented", args };
    });
  }

  async linear_comment_on_issue(args: any) {
    return this._execute("linear_comment_on_issue", async () => {
      // TODO: Implement actual logic
      return { message: "Comment on issue not implemented", args };
    });
  }

  async linear_get_sprint_issues(args: any) {
    return this._execute("linear_get_sprint_issues", async () => {
      // TODO: Implement actual logic
      return { message: "Get sprint issues not implemented", args };
    });
  }

  async linear_get_user(args: any) {
    return this._execute("linear_get_user", async () => {
      // TODO: Implement actual logic
      return { message: "Get user not implemented", args };
    });
  }
}
