import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LinearClient } from "@linear/sdk";
import { z } from "zod";
import { envConfig } from "@mcp/utils";

// ============================================================================
// LINEAR TOOLS - Read-Only Operations with Linear SDK
// ============================================================================

export function setupLinearTools(server: McpServer) {
  // Initialize Linear client
  const apiKey = envConfig.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY environment variable is required");
  }
  const linearClient = new LinearClient({ apiKey });

  // ============================================================================
  // TOOL 1: Search Issues
  // ============================================================================
  server.registerTool(
    "linear_search_issues",
    {
      title: "Search Linear Issues",
      description: "Search for Linear issues with optional filters",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Text to search in issue titles and descriptions"),
        teamId: z.string().optional().describe("Filter by team ID"),
        status: z
          .string()
          .optional()
          .describe("Filter by issue status/state name"),
        assigneeId: z
          .string()
          .optional()
          .describe("Filter by assignee user ID"),
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
      },
    },
    async ({ query, teamId, status, assigneeId, priority, limit = 10 }) => {
      try {
        // Build filter conditions
        const filter: any = {};
        if (teamId) filter.team = { id: { eq: teamId } };
        if (status) filter.state = { name: { eq: status } };
        if (assigneeId) filter.assignee = { id: { eq: assigneeId } };
        if (priority !== undefined) filter.priority = { eq: priority };

        // Execute search
        const issues = await linearClient.issues({
          filter,
          first: Math.min(limit, 50),
        });

        // Format results
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
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  issues: formattedIssues,
                  count: formattedIssues.length,
                  query: { query, teamId, status, assigneeId, priority, limit },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching issues: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL 2: Get Teams
  // ============================================================================
  server.registerTool(
    "linear_get_teams",
    {
      title: "Get Linear Teams",
      description: "Retrieve all teams in the Linear workspace",
      inputSchema: {
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
      },
    },
    async ({ includeArchived = false, limit = 20 }) => {
      try {
        const teams = await linearClient.teams({
          includeArchived,
          first: Math.min(limit, 100),
        });

        const formattedTeams = teams.nodes.map((team) => ({
          id: team.id,
          key: team.key,
          name: team.name,
          description: team.description,
          color: team.color,
          icon: team.icon,
          private: team.private,
          archivedAt: team.archivedAt?.toISOString(),
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  teams: formattedTeams,
                  count: formattedTeams.length,
                  includeArchived,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching teams: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL 3: Get Users
  // ============================================================================
  server.registerTool(
    "linear_get_users",
    {
      title: "Get Linear Users",
      description: "Retrieve users in the Linear workspace",
      inputSchema: {
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
      },
    },
    async ({ includeDisabled = false, limit = 20 }) => {
      try {
        const filter: any = {};
        if (!includeDisabled) {
          filter.active = { eq: true };
        }

        const users = await linearClient.users({
          filter,
          first: Math.min(limit, 100),
        });

        const formattedUsers = await Promise.all(
          users.nodes.map(async (user) => {
            const teams = await user.teamMemberships();

            return {
              id: user.id,
              name: user.name,
              displayName: user.displayName,
              email: user.email,
              avatarUrl: user.avatarUrl,
              active: user.active,
              admin: user.admin,
              guest: user.guest,
              teams: teams.nodes.map((membership) => ({
                teamId: (membership.team as any)?.id,
                teamName: (membership.team as any)?.name,
                teamKey: (membership.team as any)?.key,
              })),
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString(),
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  users: formattedUsers,
                  count: formattedUsers.length,
                  filters: { includeDisabled },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching users: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL 4: Get Projects
  // ============================================================================
  server.registerTool(
    "linear_get_projects",
    {
      title: "Get Linear Projects",
      description: "Retrieve projects in the Linear workspace",
      inputSchema: {
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
      },
    },
    async ({ teamId, includeArchived = false, limit = 20 }) => {
      try {
        const filter: any = {};
        if (teamId) filter.teams = { some: { id: { eq: teamId } } };
        if (!includeArchived) filter.archivedAt = { null: true };

        const projects = await linearClient.projects({
          filter,
          first: Math.min(limit, 50),
        });

        const formattedProjects = await Promise.all(
          projects.nodes.map(async (project) => {
            const teams = await project.teams();
            const lead = await project.lead;

            return {
              id: project.id,
              name: project.name,
              description: project.description,
              color: project.color,
              icon: project.icon,
              state: project.state,
              progress: project.progress,
              scope: project.scope,
              lead: lead
                ? {
                    id: lead.id,
                    name: lead.name,
                    displayName: lead.displayName,
                  }
                : null,
              teams: teams.nodes.map((team) => ({
                id: team.id,
                key: team.key,
                name: team.name,
              })),
              url: project.url,
              startDate: project.startDate?.toISOString(),
              targetDate: project.targetDate?.toISOString(),
              archivedAt: project.archivedAt?.toISOString(),
              createdAt: project.createdAt.toISOString(),
              updatedAt: project.updatedAt.toISOString(),
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  projects: formattedProjects,
                  count: formattedProjects.length,
                  filters: { teamId, includeArchived },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching projects: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL 5: Get Issue Details
  // ============================================================================
  server.registerTool(
    "linear_get_issue",
    {
      title: "Get Linear Issue Details",
      description: "Get detailed information about a specific Linear issue",
      inputSchema: {
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
      },
    },
    async ({ issueId, identifier }) => {
      try {
        if (!issueId && !identifier) {
          throw new Error("Either issueId or identifier must be provided");
        }

        let issue;
        if (issueId) {
          issue = await linearClient.issue(issueId);
        } else {
          // Find issue by identifier - use number instead of identifier
          const issues = await linearClient.issues({
            filter: {
              number: { eq: parseInt(identifier?.split("-")[1] || "0") },
            },
            first: 1,
          });
          issue = issues.nodes[0];
        }

        if (!issue) {
          throw new Error(`Issue not found: ${issueId || identifier}`);
        }

        const [state, assignee, team, project, parent, children, comments] =
          await Promise.all([
            issue.state,
            issue.assignee,
            issue.team,
            issue.project,
            issue.parent,
            issue.children(),
            issue.comments(),
          ]);

        const formattedIssue = {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          estimate: issue.estimate,
          state: state
            ? {
                id: state.id,
                name: state.name,
                color: state.color,
                type: state.type,
              }
            : null,
          assignee: assignee
            ? {
                id: assignee.id,
                name: assignee.name,
                displayName: assignee.displayName,
                email: assignee.email,
              }
            : null,
          team: team
            ? {
                id: team.id,
                key: team.key,
                name: team.name,
              }
            : null,
          project: project
            ? {
                id: project.id,
                name: project.name,
              }
            : null,
          parent: parent
            ? {
                id: parent.id,
                identifier: parent.identifier,
                title: parent.title,
              }
            : null,
          children: children.nodes.map((child) => ({
            id: child.id,
            identifier: child.identifier,
            title: child.title,
          })),
          comments: comments.nodes.map((comment) => ({
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt.toISOString(),
            user: comment.user
              ? {
                  name: (comment.user as any).name,
                  displayName: (comment.user as any).displayName,
                }
              : null,
          })),
          url: issue.url,
          createdAt: issue.createdAt.toISOString(),
          updatedAt: issue.updatedAt.toISOString(),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedIssue, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching issue: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
