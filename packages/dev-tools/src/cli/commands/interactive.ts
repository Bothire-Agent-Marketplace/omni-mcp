import * as readline from "readline";
import { Tool, Resource, Prompt, isJsonRpcSuccessResponse } from "@mcp/schemas";
import { MCPClient } from "../../utils/mcp-client.js";

interface InteractiveOptions {
  url?: string;
}

export async function interactiveMode(
  options: InteractiveOptions
): Promise<void> {
  const gatewayUrl = options.url || "http://localhost:37373";
  const client = new MCPClient(gatewayUrl);

  console.log("🎯 Starting interactive MCP testing mode...");
  console.log(`🌐 Connected to: ${gatewayUrl}`);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Cache for capabilities
  let tools: Tool[] = [];
  let resources: Resource[] = [];
  let prompts: Prompt[] = [];
  let capabilitiesLoaded = false;

  const loadCapabilities = async () => {
    if (capabilitiesLoaded) return;

    try {
      console.log("📋 Loading capabilities...");

      const [toolsResponse, resourcesResponse, promptsResponse] =
        await Promise.all([
          client.listTools(),
          client.listResources(),
          client.listPrompts(),
        ]);

      tools = isJsonRpcSuccessResponse(toolsResponse)
        ? (toolsResponse.result as { tools?: Tool[] })?.tools || []
        : [];
      resources = isJsonRpcSuccessResponse(resourcesResponse)
        ? (resourcesResponse.result as { resources?: Resource[] })?.resources ||
          []
        : [];
      prompts = isJsonRpcSuccessResponse(promptsResponse)
        ? (promptsResponse.result as { prompts?: Prompt[] })?.prompts || []
        : [];

      capabilitiesLoaded = true;
      console.log(
        `✅ Loaded ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts`
      );
      console.log();
    } catch (error) {
      console.error("❌ Failed to load capabilities:", error);
    }
  };

  const showMenu = () => {
    console.log("🎯 Interactive MCP Testing Mode");
    console.log("================================");
    console.log("1. 📋 List all capabilities");
    console.log("2. 🔧 List tools");
    console.log("3. 📂 List resources");
    console.log("4. 💬 List prompts");
    console.log("5. ⚡ Call a tool");
    console.log("6. 🔍 Search tools");
    console.log("7. 🏥 Check gateway health");
    console.log("8. 🔄 Reload capabilities");
    console.log("9. ❌ Exit");
    console.log();
  };

  const listTools = () => {
    if (tools.length === 0) {
      console.log("No tools available");
      return;
    }

    console.log("🔧 Available Tools:");
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      console.log(`     ${tool.description || "No description"}`);
    });
    console.log();
  };

  const listResources = () => {
    if (resources.length === 0) {
      console.log("No resources available");
      return;
    }

    console.log("📂 Available Resources:");
    resources.forEach((resource, index) => {
      console.log(`  ${index + 1}. ${resource.uri}`);
      console.log(`     ${resource.description || "No description"}`);
    });
    console.log();
  };

  const listPrompts = () => {
    if (prompts.length === 0) {
      console.log("No prompts available");
      return;
    }

    console.log("💬 Available Prompts:");
    prompts.forEach((prompt, index) => {
      console.log(`  ${index + 1}. ${prompt.name}`);
      console.log(`     ${prompt.description || "No description"}`);
    });
    console.log();
  };

  const generateExamplePayload = (tool: Tool): string => {
    if (!tool.inputSchema?.properties) {
      return "{}";
    }

    const example: Record<string, unknown> = {};

    Object.entries(tool.inputSchema.properties).forEach(([key, schema]) => {
      const isRequired = tool.inputSchema.required?.includes(key);

      // Only include required fields and some common optional ones in example
      if (isRequired || ["query", "limit", "name", "id"].includes(key)) {
        switch (schema.type) {
          case "string":
            if (key === "query") {
              example[key] = "search term";
            } else if (key === "name") {
              example[key] = "example name";
            } else if (key === "id") {
              example[key] = "example-id";
            } else {
              example[key] = schema.enum?.[0] || schema.default || "example";
            }
            break;
          case "number":
          case "integer":
            example[key] = schema.default || schema.minimum || 1;
            break;
          case "boolean":
            example[key] = schema.default || false;
            break;
          case "array":
            example[key] = [];
            break;
          case "object":
            example[key] = {};
            break;
        }
      }
    });

    return JSON.stringify(example, null, 2);
  };

  const callTool = async () => {
    if (tools.length === 0) {
      console.log("No tools available to call");
      return;
    }

    // Show available tools
    console.log("🔧 Select a tool to call:");
    tools.forEach((tool, index) => {
      console.log(
        `  ${index + 1}. ${tool.name} - ${tool.description || "No description"}`
      );
    });
    console.log();

    const toolChoice = await new Promise<string>((resolve) => {
      rl.question("Enter tool number (or 'back' to return): ", resolve);
    });

    if (toolChoice.toLowerCase() === "back") return;

    const toolIndex = parseInt(toolChoice) - 1;
    if (toolIndex < 0 || toolIndex >= tools.length) {
      console.log("❌ Invalid tool selection");
      return;
    }

    const selectedTool = tools[toolIndex];
    console.log(`\n🔧 Calling tool: ${selectedTool.name}`);

    // Show input schema if available
    if (selectedTool.inputSchema?.properties) {
      console.log("\n📋 Available parameters:");
      Object.entries(selectedTool.inputSchema.properties).forEach(
        ([key, schema]) => {
          const required = selectedTool.inputSchema.required?.includes(key)
            ? " (required)"
            : "";
          const type = Array.isArray(schema.type)
            ? schema.type.join("|")
            : schema.type;
          console.log(
            `  - ${key} (${type}): ${schema.description || "No description"}${required}`
          );
          if (schema.enum) {
            console.log(`    Options: ${schema.enum.join(", ")}`);
          }
          if (schema.default !== undefined) {
            console.log(`    Default: ${schema.default}`);
          }
        }
      );

      console.log("\n📝 Example payload:");
      console.log(generateExamplePayload(selectedTool));
    }

    const argsInput = await new Promise<string>((resolve) => {
      rl.question(
        "\nEnter arguments as JSON (or press Enter for empty): ",
        resolve
      );
    });

    let args = {};
    if (argsInput.trim()) {
      try {
        args = JSON.parse(argsInput);
      } catch (error) {
        console.log("❌ Invalid JSON format:", error);
        return;
      }
    }

    try {
      console.log("\n⏳ Calling tool...");
      const response = await client.callTool(selectedTool.name, args);

      console.log("✅ Tool call successful!");
      console.log("📄 Response:");
      console.log(JSON.stringify(response, null, 2));
      console.log();
    } catch (error) {
      console.error("❌ Tool call failed:", error);
    }
  };

  const searchTools = async () => {
    const query = await new Promise<string>((resolve) => {
      rl.question("🔍 Enter search query: ", resolve);
    });

    if (!query.trim()) return;

    const matchingTools = tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query.toLowerCase()) ||
        (tool.description || "").toLowerCase().includes(query.toLowerCase())
    );

    if (matchingTools.length === 0) {
      console.log("No tools found matching your search");
      return;
    }

    console.log(`🔍 Found ${matchingTools.length} matching tools:`);
    matchingTools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      console.log(`     ${tool.description || "No description"}`);
    });
    console.log();
  };

  const checkHealth = async () => {
    try {
      console.log("🏥 Checking gateway health...");
      const response = await fetch(`${gatewayUrl}/health`);
      const health = await response.json();

      console.log("✅ Gateway health check:");
      console.log(JSON.stringify(health, null, 2));
      console.log();
    } catch (error) {
      console.error("❌ Health check failed:", error);
    }
  };

  // Load capabilities on startup
  await loadCapabilities();

  // Main interactive loop
  while (true) {
    showMenu();

    const choice = await new Promise<string>((resolve) => {
      rl.question("Select an option (1-9): ", resolve);
    });

    console.log();

    switch (choice) {
      case "1":
        listTools();
        listResources();
        listPrompts();
        break;
      case "2":
        listTools();
        break;
      case "3":
        listResources();
        break;
      case "4":
        listPrompts();
        break;
      case "5":
        await callTool();
        break;
      case "6":
        await searchTools();
        break;
      case "7":
        await checkHealth();
        break;
      case "8":
        capabilitiesLoaded = false;
        await loadCapabilities();
        break;
      case "9":
        console.log("👋 Goodbye!");
        rl.close();
        return;
      default:
        console.log("❌ Invalid option. Please choose 1-9.");
    }

    // Pause before showing menu again
    await new Promise<void>((resolve) => {
      rl.question("Press Enter to continue...", () => resolve());
    });
    console.log();
  }
}
