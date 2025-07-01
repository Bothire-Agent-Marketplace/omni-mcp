import { envConfig } from "@mcp/utils";

export const CONFIG = {
  SERVICE_NAME: "query-quill-mcp-server",
  NODE_ENV: envConfig.NODE_ENV,
  LOG_LEVEL: envConfig.LOG_LEVEL,
  PORT: parseInt(process.env.PORT || "3002", 10),

  // Database Configuration - using central env management
  DATABASE: {
    HOST: envConfig.POSTGRES_HOST,
    PORT: envConfig.POSTGRES_PORT,
    NAME: envConfig.POSTGRES_DB,
    USER: envConfig.POSTGRES_USER,
    PASSWORD: envConfig.POSTGRES_PASSWORD,
    SCHEMA: process.env.DATABASE_SCHEMA || "public",
    SSL: process.env.DATABASE_SSL === "true",
    POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE || "10", 10),
    TIMEOUT: parseInt(process.env.DATABASE_TIMEOUT || "30000", 10),
  },

  // Security Settings - service-specific
  SECURITY: {
    QUERY_TIMEOUT: parseInt(process.env.QUERY_TIMEOUT || "30000", 10),
    MAX_ROWS_LIMIT: parseInt(process.env.MAX_ROWS_LIMIT || "1000", 10),
    READ_ONLY_MODE: process.env.READ_ONLY_MODE !== "false",
  },

  // TODO: Add your service-specific environment variables here
  // EXAMPLE_API_KEY: process.env.EXAMPLE_API_KEY,
} as const;

// Example validation:
// if (CONFIG.NODE_ENV !== 'development' && !CONFIG.EXAMPLE_API_KEY) {
//   console.error(`❌ EXAMPLE_API_KEY environment variable is required for query-quill`);
//   process.exit(1);
// }

// Validation
if (CONFIG.NODE_ENV !== "development") {
  if (!CONFIG.DATABASE.HOST || !CONFIG.DATABASE.NAME) {
    console.error("❌ Database configuration is required for production");
    process.exit(1);
  }
}
