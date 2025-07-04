import { Tool, Resource, Prompt } from "@mcp/schemas";
import { MCPClient } from "../../utils/mcp-client.js";

interface ListOptions {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  url?: string;
}

export async function listCapabilities(options: ListOptions): Promise<void> {
  const gatewayUrl = options.url || "http://localhost:37373";
  const client = new MCPClient(gatewayUrl);

  try {
    // If no specific option, list everything
    const listAll = !options.tools && !options.resources && !options.prompts;

    if (options.tools || listAll) {
      console.log("🔧 Tools:");
      const toolsResponse = await client.listTools();
      const toolsResult = toolsResponse.result as { tools?: Tool[] };

      if (toolsResult?.tools && toolsResult.tools.length > 0) {
        toolsResult.tools.forEach((tool: Tool) => {
          console.log(
            `  • ${tool.name}: ${tool.description || "No description"}`
          );
        });
      } else {
        console.log("  (No tools available)");
      }

      if (listAll) console.log();
    }

    if (options.resources || listAll) {
      console.log("📂 Resources:");
      const resourcesResponse = await client.listResources();
      const resourcesResult = resourcesResponse.result as {
        resources?: Resource[];
      };

      if (resourcesResult?.resources && resourcesResult.resources.length > 0) {
        resourcesResult.resources.forEach((resource: Resource) => {
          console.log(
            `  • ${resource.uri}: ${resource.description || "No description"}`
          );
        });
      } else {
        console.log("  (No resources available)");
      }

      if (listAll) console.log();
    }

    if (options.prompts || listAll) {
      console.log("💬 Prompts:");
      const promptsResponse = await client.listPrompts();
      const promptsResult = promptsResponse.result as { prompts?: Prompt[] };

      if (promptsResult?.prompts && promptsResult.prompts.length > 0) {
        promptsResult.prompts.forEach((prompt: Prompt) => {
          console.log(
            `  • ${prompt.name}: ${prompt.description || "No description"}`
          );
        });
      } else {
        console.log("  (No prompts available)");
      }
    }
  } catch (error) {
    console.error("❌ Failed to list capabilities:", error);
    process.exit(1);
  }
}
