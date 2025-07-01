import { z } from "zod";

// ============================================================================
// QUERY-QUILL HANDLERS - Clean MCP SDK Pattern
// ============================================================================

// Input Schemas
export const ExampleSearchInputSchema = z.object({
  query: z.string().min(1),
});

// Handler Functions
export async function handleExampleSearch(params: unknown) {
  const parsedParams = ExampleSearchInputSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new Error(`Invalid parameters: ${parsedParams.error.message}`);
  }

  const { query } = parsedParams.data;

  // TODO: Replace with actual database query logic
  console.log(`Searching database with query: ${query}`);
  const results = [
    { id: "1", title: `First result for '${query}'` },
    { id: "2", title: `Second result for '${query}'` },
  ];

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}
