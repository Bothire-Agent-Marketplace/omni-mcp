import { createMcpServerWithoutClient } from "@mcp/server-core";
import type { NotionServerConfig } from "../config/config.js";
import { createToolHandlers, getAvailableTools } from "./tools.js";

// TODO: Replace with your actual notion SDK/API client
// import { NotionClient } from "@notion/sdk";

export async function createNotionHttpServer(
  config: NotionServerConfig
): Promise<
  ReturnType<
    typeof import("@mcp/server-core").createMcpServerWithoutClient
  > extends Promise<infer T>
    ? T
    : never
> {
  return await createMcpServerWithoutClient({
    serverName: "notion",
    serverKey: "notion",
    config,
    createToolHandlers: () => createToolHandlers(/* notionClient */),
    getAvailableTools,
  });
}
