
import { loadEnvHierarchy } from "@mcp/utils";

const env = loadEnvHierarchy("query-quill");

export const CONFIG = {
  SERVICE_NAME: "query-quill-mcp-server",
  NODE_ENV: env.NODE_ENV || "development",
  LOG_LEVEL: env.LOG_LEVEL || "info",
  PORT: parseInt(env.PORT || "3002", 10),

  // TODO: Add your service-specific environment variables here
  // EXAMPLE_API_KEY: env.EXAMPLE_API_KEY,
} as const;

// Example validation:
// if (CONFIG.NODE_ENV !== 'development' && !CONFIG.EXAMPLE_API_KEY) {
//   console.error(`❌ EXAMPLE_API_KEY environment variable is required for query-quill`);
//   process.exit(1);
// }
