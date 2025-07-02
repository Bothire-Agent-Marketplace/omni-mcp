import { LinearClient } from "@linear/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { envConfig } from "@mcp/utils";

// ============================================================================
// LINEAR RESOURCES - Clean MCP SDK Pattern
// ============================================================================

export function setupLinearResources(server: McpServer) {
  const apiKey = envConfig.LINEAR_API_KEY;
  if (!apiKey) return; // Skip if no API key

  const linearClient = new LinearClient({ apiKey });

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
    async (uri: any) => {
      try {
        const teams = await linearClient.teams();
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                teams.nodes.map((team) => ({
                  id: team.id,
                  name: team.name,
                  key: team.key,
                  description: team.description,
                })),
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching teams: ${error.message}`,
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
    async (uri: any) => {
      try {
        const users = await linearClient.users();
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                users.nodes.map((user) => ({
                  id: user.id,
                  name: user.name,
                  displayName: user.displayName,
                  email: user.email,
                  active: user.active,
                })),
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching users: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // Note: Dynamic resources like projects/{teamId} and workflow-states/{teamId}
  // would be implemented using ResourceTemplate patterns in a more complex setup
}
