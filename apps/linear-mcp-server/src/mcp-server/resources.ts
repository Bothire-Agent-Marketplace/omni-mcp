import { LinearClient } from "@linear/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  LinearTeamResource,
  LinearUserResource,
} from "../types/linear.js";

// ============================================================================
// LINEAR RESOURCES - Clean MCP SDK Pattern
// ============================================================================

export function setupLinearResources(
  server: McpServer,
  linearClient: LinearClient
) {
  // ============================================================================
  // RESOURCE 1: Teams
  // ============================================================================
  server.registerResource(
    "linear-teams",
    "linear://teams",
    {
      title: "Linear Teams",
      description: "List of all Linear teams",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      try {
        const teams = await linearClient.teams();
        const formattedTeams: LinearTeamResource[] = teams.nodes.map(
          (team) => ({
            id: team.id,
            name: team.name,
            key: team.key,
            description: team.description,
          })
        );

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(formattedTeams, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching teams: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );

  // ============================================================================
  // RESOURCE 2: Users
  // ============================================================================
  server.registerResource(
    "linear-users",
    "linear://users",
    {
      title: "Linear Users",
      description: "List of Linear users for assignment and collaboration",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      try {
        const users = await linearClient.users();
        const formattedUsers: LinearUserResource[] = users.nodes.map(
          (user) => ({
            id: user.id,
            name: user.name,
            displayName: user.displayName,
            email: user.email,
            active: user.active,
          })
        );

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(formattedUsers, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching users: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );

  // Note: Dynamic resources like projects/{teamId} and workflow-states/{teamId}
  // would be implemented using ResourceTemplate patterns in a more complex setup
}
