import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LinearClient } from "@linear/sdk";
import { z } from "zod";
import { envConfig } from "@mcp/utils";

// ============================================================================
// LINEAR TOOLS - Clean MCP SDK Pattern
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
  // TOOL 2: Create Issue
  // ============================================================================
  server.registerTool(
    "linear_create_issue",
    {
      title: "Create Linear Issue",
      description: "Create a new Linear issue",
      inputSchema: {
        title: z.string().min(1).describe("Issue title (required)"),
        description: z.string().optional().describe("Issue description"),
        teamId: z
          .string()
          .min(1)
          .describe("Team ID where the issue will be created (required)"),
        assigneeId: z
          .string()
          .optional()
          .describe("User ID to assign the issue to"),
        priority: z
          .number()
          .min(0)
          .max(4)
          .optional()
          .describe(
            "Issue priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)"
          ),
        labelIds: z
          .array(z.string())
          .optional()
          .describe("Array of label IDs to apply"),
        projectId: z
          .string()
          .optional()
          .describe("Project ID to associate with"),
        estimate: z.number().min(0).optional().describe("Story point estimate"),
      },
    },
    async ({
      title,
      description,
      teamId,
      assigneeId,
      priority,
      labelIds,
      projectId,
      estimate,
    }) => {
      try {
        const issuePayload = await linearClient.createIssue({
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
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: issue.id,
                  identifier: issue.identifier,
                  title: issue.title,
                  url: issue.url,
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
              text: `Error creating issue: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL 3: Update Issue
  // ============================================================================
  server.registerTool(
    "linear_update_issue",
    {
      title: "Update Linear Issue",
      description: "Update an existing Linear issue",
      inputSchema: {
        issueId: z
          .string()
          .min(1)
          .describe("ID of the issue to update (required)"),
        title: z.string().optional().describe("New issue title"),
        description: z.string().optional().describe("New issue description"),
        assigneeId: z.string().optional().describe("New assignee user ID"),
        priority: z
          .number()
          .min(0)
          .max(4)
          .optional()
          .describe(
            "New priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)"
          ),
        stateId: z.string().optional().describe("New workflow state ID"),
        estimate: z
          .number()
          .min(0)
          .optional()
          .describe("New story point estimate"),
      },
    },
    async ({ issueId, ...updateFields }) => {
      try {
        const issuePayload = await linearClient.updateIssue(
          issueId,
          updateFields
        );

        const issue = await issuePayload.issue;
        if (!issue) throw new Error("Failed to update issue");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: issue.id,
                  identifier: issue.identifier,
                  title: issue.title,
                  url: issue.url,
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
              text: `Error updating issue: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
