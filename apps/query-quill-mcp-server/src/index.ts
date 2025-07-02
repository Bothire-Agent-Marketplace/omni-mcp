import { createMcpLogger } from "@mcp/utils";
import { CONFIG } from "./config/config.js";
import { startHttpServer } from "./mcp-server/http-server.js";

const logger = createMcpLogger(CONFIG.SERVICE_NAME);

logger.info(`MCP server starting up in ${CONFIG.NODE_ENV} mode...`);

startHttpServer(CONFIG.PORT);
