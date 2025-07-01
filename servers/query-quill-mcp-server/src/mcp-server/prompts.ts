import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ============================================================================
// QUERY-QUILL PROMPTS - Clean MCP SDK Pattern
// ============================================================================

export function setupQueryQuillPrompts(server: McpServer) {
  // ============================================================================
  // PROMPT 1: SQL Query Optimization Workflow
  // ============================================================================
  server.registerPrompt(
    "optimize_query_workflow",
    {
      title: "SQL Query Optimization Workflow",
      description:
        "Step-by-step workflow for optimizing SQL queries and troubleshooting performance issues",
      argsSchema: {
        queryType: z
          .string()
          .optional()
          .describe("Type of query (SELECT, JOIN, aggregate, etc.)"),
        performance: z
          .string()
          .optional()
          .describe("Current performance issues being experienced"),
      },
    },
    ({
      queryType,
      performance,
    }: {
      queryType?: string;
      performance?: string;
    }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Help me optimize SQL queries${
              queryType ? ` for ${queryType} operations` : ""
            }${
              performance ? ` experiencing ${performance}` : ""
            }. Please guide me through:

1. **Query Analysis**: Understanding the current query structure and execution plan
2. **Index Strategy**: Identifying missing or inefficient indexes
3. **Query Rewriting**: Optimizing joins, subqueries, and filtering
4. **Performance Testing**: Measuring improvements and validating changes
5. **Best Practices**: Implementing long-term optimization strategies

What specific query or performance issue would you like help with?`,
          },
        },
      ],
    })
  );

  // ============================================================================
  // PROMPT 2: Database Troubleshooting Workflow
  // ============================================================================
  server.registerPrompt(
    "database_troubleshooting_workflow",
    {
      title: "Database Troubleshooting Workflow",
      description:
        "Comprehensive workflow for diagnosing and resolving database issues",
      argsSchema: {
        issueType: z
          .string()
          .optional()
          .describe(
            "Type of issue (connectivity, performance, data integrity, etc.)"
          ),
        severity: z
          .string()
          .optional()
          .describe("Issue severity level (critical, high, medium, low)"),
      },
    },
    ({ issueType, severity }: { issueType?: string; severity?: string }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Help me troubleshoot database issues${
              issueType ? ` related to ${issueType}` : ""
            }${
              severity ? ` with ${severity} severity` : ""
            }. Let's work through:

1. **Issue Identification**: Understanding symptoms and gathering diagnostics
2. **Root Cause Analysis**: Investigating logs, metrics, and system state
3. **Impact Assessment**: Determining scope and urgency of the problem
4. **Resolution Strategy**: Planning and implementing fixes
5. **Prevention**: Setting up monitoring and preventive measures

What specific database issue are you experiencing?`,
          },
        },
      ],
    })
  );

  // ============================================================================
  // PROMPT 3: Data Analysis Workflow
  // ============================================================================
  server.registerPrompt(
    "data_analysis_workflow",
    {
      title: "Database Data Analysis Workflow",
      description:
        "Structured approach to analyzing and extracting insights from database data",
      argsSchema: {
        dataType: z
          .string()
          .optional()
          .describe(
            "Type of data being analyzed (transactional, analytical, time-series, etc.)"
          ),
        objective: z
          .string()
          .optional()
          .describe(
            "Analysis objective (reporting, investigation, optimization, etc.)"
          ),
      },
    },
    ({ dataType, objective }: { dataType?: string; objective?: string }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Let's analyze database data${
              dataType ? ` for ${dataType} patterns` : ""
            }${objective ? ` with the goal of ${objective}` : ""}. We'll cover:

1. **Data Discovery**: Understanding available tables, relationships, and data quality
2. **Query Design**: Building efficient analytical queries
3. **Data Validation**: Ensuring accuracy and completeness
4. **Pattern Recognition**: Identifying trends, anomalies, and insights
5. **Reporting**: Presenting findings in a clear, actionable format

What data analysis challenge can I help you with?`,
          },
        },
      ],
    })
  );
}
