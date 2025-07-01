import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  // Handlers
  handleExampleSearch,

  // Schemas
  ExampleSearchInputSchema,
} from "./handlers.js";

// This object centralizes the metadata for all tools.
const ToolMetadata = {
  query_quill_search: {
    title: "Query Quill Search",
    description: "Search database with natural language query",
    inputSchema: ExampleSearchInputSchema.shape,
  },
};

export function setupQueryQuillTools(server: McpServer) {
  // Register all tools using a loop for consistency and maintainability.
  server.registerTool(
    "query_quill_search",
    ToolMetadata.query_quill_search,
    handleExampleSearch
  );
}
