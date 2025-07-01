import { LinearClient } from "@linear/sdk";
import { McpResponse } from "@mcp/schemas";
import {
  createMcpLogger,
  generateRequestId,
  type McpLogContext,
} from "@mcp/utils";
import {
  CreateIssueArgs,
  UpdateIssueArgs,
  SearchIssuesArgs,
  LinearIssue,
  IssueResult,
} from "../../types/linear-types.js";

// Linear Tools Implementation
// Following Enterprise MCP Server Pattern

export class LinearTools {
  private client: LinearClient;
  private apiKey: string;
  private baseUrl: string;
  private logger = createMcpLogger("linear-mcp-server");

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error("Linear API key is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.linear.app";
    this.client = new LinearClient({ apiKey });
  }

  // MANDATORY: Use _execute wrapper for consistent error handling
  private async _execute<T = any>(
    toolName: string,
    logic: () => Promise<T>,
    requestId?: string,
    params?: any
  ): Promise<McpResponse<T>> {
    const reqId = requestId || generateRequestId();
    const startTime = Date.now();

    this.logger.toolExecution(toolName, reqId, {
      toolParameters: params,
      linearApiKey: this.apiKey ? "✓ Configured" : "❌ Missing",
    });

    try {
      const data = await logic();
      const duration = Date.now() - startTime;
      this.logger.toolCompleted(toolName, reqId, true, duration, {
        resultCount: Array.isArray(data) ? data.length : 1,
        toolParameters: params,
      });
      return { success: true, data };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.toolCompleted(toolName, reqId, false, duration, {
        errorMessage: error.message,
        toolParameters: params,
      });
      this.logger.error(`Tool execution failed: ${toolName}`, error, {
        toolName,
        requestId: reqId,
        toolParameters: params,
      });
      return { success: false, error: error.message };
    }
  }

  // Linear-specific tool implementations
  async linear_search_issues(args: Partial<SearchIssuesArgs> = {}): Promise<
    McpResponse<{
      issues: LinearIssue[];
      count: number;
      query: Partial<SearchIssuesArgs>;
    }>
  > {
    return this._execute(
      "linear_search_issues",
      async () => {
        const {
          query,
          teamId,
          status,
          assigneeId,
          priority,
          limit = 10,
        } = args;

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
              (await issue.assignee)?.displayName ||
              (
                await issue.assignee
              )?.name,
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
      },
      undefined,
      args
    );
  }

  async linear_create_issue(
    args: CreateIssueArgs
  ): Promise<McpResponse<IssueResult>> {
    return this._execute(
      "linear_create_issue",
      async () => {
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

        const result: IssueResult = {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
        };

        return result;
      },
      undefined,
      args
    );
  }

  async linear_update_issue(
    args: UpdateIssueArgs
  ): Promise<McpResponse<IssueResult>> {
    return this._execute(
      "linear_update_issue",
      async () => {
        const { issueId, ...updateFields } = args;
        const issuePayload = await this.client.updateIssue(
          issueId,
          updateFields
        );

        const issue = await issuePayload.issue;
        if (!issue) throw new Error("Failed to update issue");

        const result: IssueResult = {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
        };

        return result;
      },
      undefined,
      args
    );
  }
}
