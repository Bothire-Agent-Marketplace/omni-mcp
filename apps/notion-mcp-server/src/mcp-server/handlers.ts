import {
  SearchNotionItemsRequestSchema,
  GetNotionItemRequestSchema,
  CreateNotionItemRequestSchema,
} from "../schemas/domain-schemas.js";
import type {
  NotionItemResource,
  NotionProjectResource,
} from "../types/domain-types.js";

interface _NotionItemFilter {
  query?: string;
  limit?: number;
}

export async function handleNotionSearchItems(params: unknown) {
  const validatedParams = SearchNotionItemsRequestSchema.parse(params);
  const { query, limit: _limit } = validatedParams;

  const items = [
    {
      id: "1",
      title: `Sample ${query || "item"}`,
      description: "Development stub item",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ items, count: items.length }, null, 2),
      },
    ],
  };
}

export async function handleNotionGetItem(params: unknown) {
  const validatedParams = GetNotionItemRequestSchema.parse(params);
  const { id } = validatedParams;

  const item = {
    id,
    title: `Sample item ${id}`,
    description: "Development stub item",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(item, null, 2),
      },
    ],
  };
}

export async function handleNotionCreateItem(params: unknown) {
  const validatedParams = CreateNotionItemRequestSchema.parse(params);
  const { title, description } = validatedParams;

  const item = {
    id: Math.random().toString(36).substring(7),
    title,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(item, null, 2),
      },
    ],
  };
}

function getNotionHeaders(): Record<string, string> {
  const token = process.env.NOTION_API_KEY || "";
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

export async function handleNotionCreateDatabase(params: unknown) {
  const p = params as { parentPageId?: string; title?: string };
  if (!p?.parentPageId || !p?.title) {
    throw new Error("parentPageId and title are required");
  }

  const payload = {
    parent: { type: "page_id", page_id: p.parentPageId },
    title: [{ type: "text", text: { content: p.title } }],
    properties: {
      Title: { title: {} },
      Date: { date: {} },
      TicketId: { rich_text: {} },
      Summary: { rich_text: {} },
      FollowUpDate: { date: {} },
      FollowUpNeeded: { checkbox: {} },
    },
  };

  const res = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: getNotionHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return {
    content: [{ type: "text" as const, text: JSON.stringify(json, null, 2) }],
  };
}

export async function handleNotionQueryDatabase(params: unknown) {
  const p = params as {
    databaseId?: string;
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filter?: unknown;
  };
  if (!p?.databaseId) throw new Error("databaseId is required");

  const sorts =
    p.sortBy === "Date"
      ? [
          {
            property: "Date",
            direction: p.sortOrder === "asc" ? "ascending" : "descending",
          },
        ]
      : undefined;

  const payload: Record<string, unknown> = {};
  if (p.filter) payload.filter = p.filter;
  if (sorts) payload.sorts = sorts as unknown;
  if (p.cursor) payload.start_cursor = p.cursor;
  if (p.limit) payload.page_size = p.limit;

  const res = await fetch(
    `https://api.notion.com/v1/databases/${p.databaseId}/query`,
    {
      method: "POST",
      headers: getNotionHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await res.json();
  return {
    content: [{ type: "text" as const, text: JSON.stringify(json, null, 2) }],
  };
}

export async function handleNotionCreatePage(params: unknown) {
  const p = params as {
    databaseId?: string;
    title?: string;
    date?: string;
    ticketId?: string;
    summary?: string;
    followUpDate?: string;
    followUpNeeded?: boolean;
  };
  if (!p?.databaseId || !p?.title || !p?.date) {
    throw new Error("databaseId, title, date are required");
  }

  const properties: Record<string, unknown> = {
    Title: { title: [{ type: "text", text: { content: p.title } }] },
    Date: { date: { start: p.date } },
  };
  if (p.ticketId)
    properties.TicketId = {
      rich_text: [{ type: "text", text: { content: p.ticketId } }],
    };
  if (p.summary)
    properties.Summary = {
      rich_text: [{ type: "text", text: { content: p.summary } }],
    };
  if (p.followUpDate)
    properties.FollowUpDate = { date: { start: p.followUpDate } };
  if (typeof p.followUpNeeded === "boolean")
    properties.FollowUpNeeded = { checkbox: p.followUpNeeded };

  const payload = {
    parent: { database_id: p.databaseId },
    properties,
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: getNotionHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return {
    content: [{ type: "text" as const, text: JSON.stringify(json, null, 2) }],
  };
}

export async function handleNotionUpdatePageRelations(params: unknown) {
  const p = params as {
    pageId?: string;
    relatedPageIds?: string[];
    propertyName?: string;
  };
  if (!p?.pageId || !p?.relatedPageIds) {
    throw new Error("pageId and relatedPageIds are required");
  }
  const propName = p.propertyName || "RelatedTickets";
  const payload = {
    properties: {
      [propName]: { relation: p.relatedPageIds.map((id) => ({ id })) },
    },
  };
  const res = await fetch(`https://api.notion.com/v1/pages/${p.pageId}`, {
    method: "PATCH",
    headers: getNotionHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return {
    content: [{ type: "text" as const, text: JSON.stringify(json, null, 2) }],
  };
}

export async function handleNotionSearch(params: unknown) {
  const p = params as {
    query?: string;
    limit?: number;
    filter?: "page" | "database";
  };
  if (!p?.query) throw new Error("query is required");
  const payload: Record<string, unknown> = { query: p.query };
  if (p.limit) payload.page_size = p.limit;
  if (p.filter) payload.filter = { value: p.filter, property: "object" };
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: getNotionHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return {
    content: [{ type: "text" as const, text: JSON.stringify(json, null, 2) }],
  };
}

async function _handleNotionItemsResource(uri: string) {
  try {
    const items: NotionItemResource[] = [
      {
        id: "1",
        title: "Sample Item",
        description: "Development stub item",
        uri: uri,
        mimeType: "application/json",
      },
    ];

    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(items, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      contents: [
        {
          uri: uri,
          text: `Error fetching items: ${errorMessage}`,
        },
      ],
    };
  }
}

async function _handleNotionProjectsResource(uri: string) {
  try {
    const projects: NotionProjectResource[] = [
      {
        id: "1",
        name: "Sample Project",
        description: "Development stub project",
        uri: uri,
        mimeType: "application/json",
      },
    ];

    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      contents: [
        {
          uri: uri,
          text: `Error fetching projects: ${errorMessage}`,
        },
      ],
    };
  }
}
