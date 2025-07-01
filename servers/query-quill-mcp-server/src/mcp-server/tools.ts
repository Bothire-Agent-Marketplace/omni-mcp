import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  // Handlers
  handleCustomerLookup,
  handleFilmInventory,
  handleRentalAnalysis,
  handlePaymentInvestigation,
  handleBusinessAnalytics,
  handleDatabaseHealth,

  // Schemas
  CustomerLookupSchema,
  FilmInventorySchema,
  RentalAnalysisSchema,
  PaymentInvestigationSchema,
  BusinessAnalyticsSchema,
  DatabaseHealthSchema,
} from "./handlers.js";

// This object centralizes the metadata for all tools.
const ToolMetadata = {
  customer_lookup: {
    title: "Customer Lookup",
    description:
      "Search for customers by name, email, or ID. Get detailed customer profile with rental history and spending patterns.",
    inputSchema: CustomerLookupSchema.shape,
  },

  film_inventory: {
    title: "Film Inventory Check",
    description:
      "Check film availability and inventory details across stores. Search by partial film title to see copies available, currently rented, and film details.",
    inputSchema: FilmInventorySchema.shape,
  },

  rental_analysis: {
    title: "Customer Rental Analysis",
    description:
      "Analyze a customer's rental patterns, spending habits, and return history. Useful for customer support and account investigation.",
    inputSchema: RentalAnalysisSchema.shape,
  },

  payment_investigation: {
    title: "Payment Investigation",
    description:
      "Search and analyze payment records with flexible filtering. Useful for billing disputes, refund requests, and financial investigations.",
    inputSchema: PaymentInvestigationSchema.shape,
  },

  business_analytics: {
    title: "Business Analytics",
    description:
      "Generate business intelligence reports including top-performing films, customer spending patterns, geographic revenue analysis, and more.",
    inputSchema: BusinessAnalyticsSchema.shape,
  },

  database_health: {
    title: "Database Health Check",
    description:
      "Monitor database performance and health including table sizes, connection stats, query performance, and partition information.",
    inputSchema: DatabaseHealthSchema.shape,
  },
};

export function setupQueryQuillTools(server: McpServer) {
  // Register all tools using a loop for consistency and maintainability.

  server.registerTool(
    "customer_lookup",
    ToolMetadata.customer_lookup,
    handleCustomerLookup
  );

  server.registerTool(
    "film_inventory",
    ToolMetadata.film_inventory,
    handleFilmInventory
  );

  server.registerTool(
    "rental_analysis",
    ToolMetadata.rental_analysis,
    handleRentalAnalysis
  );

  server.registerTool(
    "payment_investigation",
    ToolMetadata.payment_investigation,
    handlePaymentInvestigation
  );

  server.registerTool(
    "business_analytics",
    ToolMetadata.business_analytics,
    handleBusinessAnalytics
  );

  server.registerTool(
    "database_health",
    ToolMetadata.database_health,
    handleDatabaseHealth
  );
}
