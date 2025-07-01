import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { envConfig } from "@mcp/utils";

// ============================================================================
// QUERY-QUILL RESOURCES - Clean MCP SDK Pattern
// ============================================================================

export function setupQueryQuillResources(server: McpServer) {
  // ============================================================================
  // RESOURCE 1: Database Schema
  // ============================================================================
  server.registerResource(
    "query-quill-schema",
    "query-quill://schema",
    {
      title: "Database Schema",
      description: "Current database schema and table information",
      mimeType: "application/json",
    },
    async (uri: any) => {
      try {
        // TODO: Implement actual schema discovery
        const schema = {
          database: envConfig.POSTGRES_DB,
          tables: [
            {
              name: "example_table",
              columns: [
                { name: "id", type: "integer", nullable: false },
                { name: "name", type: "varchar", nullable: true },
                { name: "created_at", type: "timestamp", nullable: false },
              ],
            },
          ],
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching schema: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // ============================================================================
  // RESOURCE 2: Query History
  // ============================================================================
  server.registerResource(
    "query-quill-history",
    "query-quill://history",
    {
      title: "Query History",
      description: "Recent successful queries and results",
      mimeType: "application/json",
    },
    async (uri: any) => {
      try {
        // TODO: Implement actual query history tracking
        const history = {
          recent_queries: [
            {
              query: "SELECT * FROM example_table LIMIT 10",
              timestamp: new Date().toISOString(),
              status: "success",
              row_count: 10,
            },
          ],
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching query history: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
