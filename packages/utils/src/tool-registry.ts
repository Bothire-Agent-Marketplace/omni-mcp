// Centralized Tool Registry - Single source of truth for all MCP tools
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  serverId: string;
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // Linear Tools
  linear_search_issues: {
    name: "linear_search_issues",
    description: "Search for Linear issues with optional filters",
    serverId: "linear",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search in issue titles and descriptions",
        },
        teamId: {
          type: "string",
          description: "Filter by team ID",
        },
        status: {
          type: "string",
          description: "Filter by issue status/state name",
        },
        assigneeId: {
          type: "string",
          description: "Filter by assignee user ID",
        },
        priority: {
          type: "number",
          minimum: 0,
          maximum: 4,
          description:
            "Filter by priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          default: 10,
          description: "Maximum number of issues to return",
        },
      },
    },
  },
  linear_get_teams: {
    name: "linear_get_teams",
    description: "Retrieve all teams in the Linear workspace",
    serverId: "linear",
    inputSchema: {
      type: "object",
      properties: {
        includeArchived: {
          type: "boolean",
          default: false,
          description: "Include archived teams in results",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 20,
          description: "Maximum number of teams to return",
        },
      },
    },
  },

  linear_get_users: {
    name: "linear_get_users",
    description: "Retrieve users in the Linear workspace",
    serverId: "linear",
    inputSchema: {
      type: "object",
      properties: {
        includeDisabled: {
          type: "boolean",
          default: false,
          description: "Include disabled users in results",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 20,
          description: "Maximum number of users to return",
        },
      },
    },
  },

  linear_get_projects: {
    name: "linear_get_projects",
    description: "Retrieve projects in the Linear workspace",
    serverId: "linear",
    inputSchema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: "Filter projects by team",
        },
        includeArchived: {
          type: "boolean",
          default: false,
          description: "Include archived projects",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          default: 20,
          description: "Maximum number of projects to return",
        },
      },
    },
  },

  linear_get_issue: {
    name: "linear_get_issue",
    description: "Get detailed information about a specific Linear issue",
    serverId: "linear",
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Issue ID (either issueId or identifier required)",
        },
        identifier: {
          type: "string",
          description:
            "Issue identifier like 'TEAM-123' (either issueId or identifier required)",
        },
      },
    },
  },

  // QueryQuill Tools
  customer_lookup: {
    name: "customer_lookup",
    description: "Look up customer information from the database",
    serverId: "queryQuill",
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "number",
          description: "Customer ID to look up",
        },
        email: {
          type: "string",
          description: "Customer email to search for",
        },
        firstName: {
          type: "string",
          description: "Customer first name to search for",
        },
        lastName: {
          type: "string",
          description: "Customer last name to search for",
        },
      },
    },
  },

  film_inventory: {
    name: "film_inventory",
    description: "Check film inventory and availability",
    serverId: "queryQuill",
    inputSchema: {
      type: "object",
      properties: {
        filmTitle: {
          type: "string",
          description: "Film title to search for",
        },
        storeId: {
          type: "number",
          description: "Store ID to check inventory for",
        },
        categoryId: {
          type: "number",
          description: "Film category ID to filter by",
        },
      },
    },
  },

  rental_analysis: {
    name: "rental_analysis",
    description: "Analyze rental patterns and statistics",
    serverId: "queryQuill",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          format: "date",
          description: "Start date for analysis period",
        },
        endDate: {
          type: "string",
          format: "date",
          description: "End date for analysis period",
        },
        customerId: {
          type: "number",
          description: "Specific customer ID to analyze",
        },
      },
    },
  },

  payment_investigation: {
    name: "payment_investigation",
    description: "Investigate payment records and transactions",
    serverId: "queryQuill",
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "number",
          description: "Customer ID to investigate payments for",
        },
        paymentId: {
          type: "number",
          description: "Specific payment ID to investigate",
        },
        amountRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
          description: "Payment amount range to filter by",
        },
      },
    },
  },

  business_analytics: {
    name: "business_analytics",
    description: "Generate business analytics and reports",
    serverId: "queryQuill",
    inputSchema: {
      type: "object",
      properties: {
        reportType: {
          type: "string",
          enum: [
            "revenue",
            "top_customers",
            "popular_films",
            "store_performance",
          ],
          description: "Type of business report to generate",
        },
        period: {
          type: "string",
          enum: ["daily", "weekly", "monthly", "yearly"],
          description: "Time period for the report",
        },
        storeId: {
          type: "number",
          description: "Specific store ID to analyze",
        },
      },
    },
  },

  database_health: {
    name: "database_health",
    description: "Check database health and performance metrics",
    serverId: "queryQuill",
    inputSchema: {
      type: "object",
      properties: {
        checkType: {
          type: "string",
          enum: ["connections", "performance", "integrity", "overview"],
          description: "Type of health check to perform",
        },
      },
    },
  },
};

// Helper functions
export function getToolsByServerId(serverId: string): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).filter(
    (tool) => tool.serverId === serverId
  );
}

export function getToolDefinition(
  toolName: string
): ToolDefinition | undefined {
  return TOOL_REGISTRY[toolName];
}

export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY);
}

export function getServerIds(): string[] {
  return [
    ...new Set(Object.values(TOOL_REGISTRY).map((tool) => tool.serverId)),
  ];
}
