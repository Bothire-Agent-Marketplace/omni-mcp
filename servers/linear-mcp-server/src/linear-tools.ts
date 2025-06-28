import { z } from "zod";
import { LinearClient } from "@linear/sdk";
import {
  searchIssuesSchema,
  createIssueSchema,
  updateIssueSchema,
  getTeamsSchema,
  getProjectsSchema,
  getWorkflowStatesSchema,
  getIssueSchema,
  getSprintIssuesSchema,
  getUserSchema,
  commentOnIssueSchema,
  type SearchIssuesInput,
  type CreateIssueInput,
  type UpdateIssueInput,
  type GetTeamsInput,
  type GetProjectsInput,
  type GetWorkflowStatesInput,
  type GetIssueInput,
  type GetSprintIssuesInput,
  type GetUserInput,
  type CommentOnIssueInput,
  type LinearResponse,
} from "./schemas.js";

// =============================================================================
// Simplified Linear API Tool Implementations
// =============================================================================

export class LinearTools {
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
  }

  async searchIssues(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = searchIssuesSchema.parse(input) as SearchIssuesInput;

      // Simple issues query without complex filtering for now
      const issues = await this.client.issues({
        first: validated.limit,
      });

      let filteredIssues = issues.nodes;

      // Apply text search if query is provided
      if (validated.query) {
        const queryLower = validated.query.toLowerCase();
        filteredIssues = filteredIssues.filter(
          (issue) =>
            issue.title.toLowerCase().includes(queryLower) ||
            (issue.description &&
              issue.description.toLowerCase().includes(queryLower))
        );
      }

      // Format issues with basic information
      const formattedIssues = await Promise.all(
        filteredIssues.map(async (issue) => {
          const state = await issue.state;
          const assignee = await issue.assignee;
          const team = await issue.team;

          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            state: state?.name || null,
            assignee: assignee?.name || null,
            team: team?.name || null,
            url: issue.url,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
          };
        })
      );

      return {
        success: true,
        data: {
          issues: formattedIssues,
          count: formattedIssues.length,
          query: validated,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async createIssue(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = createIssueSchema.parse(input) as CreateIssueInput;

      const issuePayload: any = {
        title: validated.title,
        teamId: validated.teamId,
      };

      if (validated.description)
        issuePayload.description = validated.description;
      if (validated.assigneeId) issuePayload.assigneeId = validated.assigneeId;
      if (validated.priority !== undefined)
        issuePayload.priority = validated.priority;
      if (validated.labelIds) issuePayload.labelIds = validated.labelIds;
      if (validated.projectId) issuePayload.projectId = validated.projectId;
      if (validated.estimate) issuePayload.estimate = validated.estimate;

      const issuePayloadResult = await this.client.createIssue(issuePayload);
      const issue = await issuePayloadResult.issue;

      if (!issue) {
        throw new Error("Failed to create issue");
      }

      // Properly await the related entities
      const state = await issue.state;
      const assignee = await issue.assignee;
      const team = await issue.team;

      return {
        success: true,
        data: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          url: issue.url,
          state: state?.name,
          assignee: assignee?.name,
          team: team?.name,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async updateIssue(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = updateIssueSchema.parse(input) as UpdateIssueInput;

      const updatePayload: any = {};

      if (validated.title) updatePayload.title = validated.title;
      if (validated.description)
        updatePayload.description = validated.description;
      if (validated.assigneeId) updatePayload.assigneeId = validated.assigneeId;
      if (validated.priority !== undefined)
        updatePayload.priority = validated.priority;
      if (validated.stateId) updatePayload.stateId = validated.stateId;
      if (validated.estimate) updatePayload.estimate = validated.estimate;

      const updateResult = await this.client.updateIssue(
        validated.issueId,
        updatePayload
      );
      const issue = await updateResult.issue;

      if (!issue) {
        throw new Error("Failed to update issue");
      }

      // Properly await the related entities
      const state = await issue.state;
      const assignee = await issue.assignee;

      return {
        success: true,
        data: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          url: issue.url,
          state: state?.name,
          assignee: assignee?.name,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getTeams(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = getTeamsSchema.parse(input) as GetTeamsInput;

      const teams = await this.client.teams({
        first: validated.limit,
      });

      const formattedTeams = teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
        description: team.description,
      }));

      return {
        success: true,
        data: {
          teams: formattedTeams,
          count: formattedTeams.length,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getProjects(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = getProjectsSchema.parse(input) as GetProjectsInput;

      const filter: any = {};
      if (validated.teamId) {
        filter.team = { id: { eq: validated.teamId } };
      }

      const projects = await this.client.projects({
        filter,
        first: validated.limit,
      });

      const formattedProjects = projects.nodes.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        state: project.state,
        progress: project.progress,
        url: project.url,
        startDate: project.startDate,
        targetDate: project.targetDate,
      }));

      return {
        success: true,
        data: {
          projects: formattedProjects,
          count: formattedProjects.length,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getWorkflowStates(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = getWorkflowStatesSchema.parse(
        input
      ) as GetWorkflowStatesInput;

      const filter: any = {};
      if (validated.teamId) {
        filter.team = { id: { eq: validated.teamId } };
      }

      const states = await this.client.workflowStates({
        filter,
      });

      // Properly await team for each state
      const formattedStates = await Promise.all(
        states.nodes.map(async (state) => {
          const team = await state.team;
          return {
            id: state.id,
            name: state.name,
            type: state.type,
            color: state.color,
            position: state.position,
            team: team?.name,
          };
        })
      );

      return {
        success: true,
        data: {
          states: formattedStates,
          count: formattedStates.length,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getIssue(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = getIssueSchema.parse(input) as GetIssueInput;

      const issue = await this.client.issue(validated.issueId);

      if (!issue) {
        throw new Error(`Issue with ID ${validated.issueId} not found`);
      }

      // Properly await all related entities
      const state = await issue.state;
      const assignee = await issue.assignee;
      const team = await issue.team;
      const labels = await issue.labels();

      return {
        success: true,
        data: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          estimate: issue.estimate,
          state: state?.name,
          assignee: assignee?.name,
          team: team?.name,
          labels: labels?.nodes?.map((label) => label.name) || [],
          url: issue.url,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async commentOnIssue(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = commentOnIssueSchema.parse(
        input
      ) as CommentOnIssueInput;

      const commentResult = await this.client.createComment({
        issueId: validated.issueId,
        body: validated.body,
      });

      const comment = await commentResult.comment;

      if (!comment) {
        throw new Error("Failed to create comment");
      }

      // Properly await the user entity
      const user = await comment.user;

      return {
        success: true,
        data: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          user: user?.name,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getSprintIssues(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = getSprintIssuesSchema.parse(
        input
      ) as GetSprintIssuesInput;

      const cycle = await this.client.cycle(validated.cycleId);

      if (!cycle) {
        throw new Error(`Cycle with ID ${validated.cycleId} not found`);
      }

      const issues = await cycle.issues({
        first: validated.limit,
      });

      const formattedIssues = await Promise.all(
        issues.nodes.map(async (issue) => {
          const state = await issue.state;
          const assignee = await issue.assignee;
          const team = await issue.team;

          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            state: state?.name || null,
            assignee: assignee?.name || null,
            team: team?.name || null,
            url: issue.url,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
          };
        })
      );

      const team = await cycle.team;

      return {
        success: true,
        data: {
          cycle: {
            id: cycle.id,
            name: cycle.name,
            number: cycle.number,
            team: team?.name,
            startsAt: cycle.startsAt,
            endsAt: cycle.endsAt,
          },
          issues: formattedIssues,
          count: formattedIssues.length,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getUser(input: unknown): Promise<LinearResponse> {
    const startTime = Date.now();

    try {
      const validated = getUserSchema.parse(input) as GetUserInput;

      let user;

      if (validated.userId) {
        user = await this.client.user(validated.userId);
      } else if (validated.email) {
        // For email lookup, we need to search through users
        const users = await this.client.users();
        user = users.nodes.find((u) => u.email === validated.email);
      } else {
        // Get current viewer (authenticated user)
        user = await this.client.viewer;
      }

      if (!user) {
        throw new Error("User not found");
      }

      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isMe: user.isMe,
          active: user.active,
          admin: user.admin,
          createdAt: user.createdAt,
        },
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private handleError(error: unknown, startTime: number): LinearResponse {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        validationErrors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          received: (e as any).received,
        })),
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime,
    };
  }
}
