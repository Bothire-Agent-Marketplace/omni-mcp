// Import servers and registry for auto-registration
import { serverRegistry } from "./mcp-server-registry.js";
import { LINEAR_SERVER, PERPLEXITY_SERVER, DEVTOOLS_SERVER } from "./servers/index.js";

// ============================================================================
// MCP CAPABILITIES - Centralized Export
// ============================================================================

// Export types and schema
export * from "./types.js";

// Export registry system
export * from "./mcp-server-registry.js";

// Export all server definitions
export * from "./servers/index.js";

// Auto-register all defined servers
serverRegistry.register(LINEAR_SERVER);

serverRegistry.register(PERPLEXITY_SERVER);

serverRegistry.register(DEVTOOLS_SERVER);

// Export registry as default for gateway usage
export { serverRegistry as default };
