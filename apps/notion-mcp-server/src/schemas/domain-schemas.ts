import { z } from "zod";

export const SearchNotionItemsRequestSchema = z.object({
  query: z.string().describe("Text to search in item titles and descriptions"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of items to return"),
});

export const GetNotionItemRequestSchema = z.object({
  id: z.string().describe("ID of the notion item to retrieve"),
});

export const CreateNotionItemRequestSchema = z.object({
  title: z.string().describe("Title for the new notion item"),
  description: z
    .string()
    .optional()
    .describe("Description for the new notion item"),
});
