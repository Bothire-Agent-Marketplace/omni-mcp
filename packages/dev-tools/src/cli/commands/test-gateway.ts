import { Tool, Resource, Prompt } from "@mcp/schemas";
import { MCPClient } from "../../utils/mcp-client.js";

interface TestGatewayOptions {
  url: string;
  interactive?: boolean;
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  call?: string;
  args?: string;
}

export async function testGateway(options: TestGatewayOptions): Promise<void> {
  console.log(`🌐 Testing MCP Gateway at ${options.url}`);
  console.log();

  const client = new MCPClient(options.url);

  try {
    // Test health first
    console.log("🏥 Checking gateway health...");
    const health = await client.checkHealth();
    console.log("✅ Gateway is healthy");
    console.log(JSON.stringify(health, null, 2));
    console.log();

    // Test specific options
    if (
      options.tools ||
      (!options.resources && !options.prompts && !options.call)
    ) {
      console.log("📋 Testing tools/list...");
      const toolsResponse = await client.listTools();
      const toolsResult = toolsResponse.result as { tools?: Tool[] };
      if (toolsResult?.tools) {
        console.log(`✅ Found ${toolsResult.tools.length} tools:`);
        toolsResult.tools.forEach((tool: Tool) => {
          console.log(
            `  - ${tool.name}: ${tool.description || "No description"}`
          );
        });
      } else {
        console.log("⚠️  No tools found");
      }
      console.log();
    }

    if (
      options.resources ||
      (!options.tools && !options.prompts && !options.call)
    ) {
      console.log("📂 Testing resources/list...");
      const resourcesResponse = await client.listResources();
      const resourcesResult = resourcesResponse.result as {
        resources?: Resource[];
      };
      if (resourcesResult?.resources) {
        console.log(`✅ Found ${resourcesResult.resources.length} resources:`);
        resourcesResult.resources.forEach((resource: Resource) => {
          console.log(
            `  - ${resource.uri}: ${resource.description || "No description"}`
          );
        });
      } else {
        console.log("⚠️  No resources found");
      }
      console.log();
    }

    if (
      options.prompts ||
      (!options.tools && !options.resources && !options.call)
    ) {
      console.log("💬 Testing prompts/list...");
      const promptsResponse = await client.listPrompts();
      const promptsResult = promptsResponse.result as { prompts?: Prompt[] };
      if (promptsResult?.prompts) {
        console.log(`✅ Found ${promptsResult.prompts.length} prompts:`);
        promptsResult.prompts.forEach((prompt: Prompt) => {
          console.log(
            `  - ${prompt.name}: ${prompt.description || "No description"}`
          );
        });
      } else {
        console.log("⚠️  No prompts found");
      }
      console.log();
    }

    if (options.call) {
      console.log(`🔧 Calling tool: ${options.call}`);
      const args = options.args ? JSON.parse(options.args) : {};
      const callResponse = await client.callTool(options.call, args);
      console.log("✅ Tool call result:");
      console.log(JSON.stringify(callResponse, null, 2));
    }
  } catch (error) {
    console.error(`❌ Error testing gateway: ${error}`);
    process.exit(1);
  }
}
