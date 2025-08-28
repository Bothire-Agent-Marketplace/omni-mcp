import { serverRegistry } from "./mcp-server-registry.js";
import {
  LINEAR_SERVER,
  PERPLEXITY_SERVER,
  DEVTOOLS_SERVER,
  NOTION_SERVER,
} from "./servers/index.js";

export * from "./types.js";

export * from "./mcp-server-registry.js";

export * from "./servers/index.js";

serverRegistry.register(LINEAR_SERVER);

serverRegistry.register(PERPLEXITY_SERVER);

serverRegistry.register(DEVTOOLS_SERVER);

serverRegistry.register(NOTION_SERVER);

export { serverRegistry as default };
