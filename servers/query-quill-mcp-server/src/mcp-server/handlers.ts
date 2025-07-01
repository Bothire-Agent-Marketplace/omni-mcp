
import { z } from "zod";

const ExampleSearchSchema = z.object({
  query: z.string().min(1),
});

export async function handleExampleSearch(params: unknown) {
  const parsedParams = ExampleSearchSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new Error(`Invalid parameters: ${parsedParams.error.message}`);
  }

  const { query } = parsedParams.data;

  // TODO: Replace with your actual business logic
  console.log(`Searching with query: ${query}`);
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
