import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ServiceFactory } from "@/lib/services/service.factory";
import { McpTestingView } from "@/components/views/mcp-testing-view";

export default async function McpTestingPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organizationService = ServiceFactory.getOrganizationService();
  const organization =
    await organizationService.getOrganizationByClerkId(orgId);

  if (!organization) {
    redirect("/");
  }

  // Get available organizations for context switching (for admin testing)
  const userService = ServiceFactory.getUserService();
  const userWithOrgs = await userService.getUserWithOrganizations(userId);

  const availableOrganizations =
    userWithOrgs?.memberships.map((membership) => ({
      id: membership.organization.id,
      clerkId: membership.organization.clerkId,
      name: membership.organization.name,
      role: membership.role,
    })) || [];

  // Server-side data fetching following Next.js App Router best practices
  // Pages handle data, Views handle presentation
  const initialCapabilities = await loadMcpCapabilities();

  return (
    <McpTestingView
      currentOrganization={{
        id: organization.id,
        clerkId: organization.clerkId,
        name: organization.name,
      }}
      availableOrganizations={availableOrganizations}
      initialCapabilities={initialCapabilities}
    />
  );
}

/**
 * Server-side MCP capabilities loading
 * This follows the "Pages handle data" principle from Next.js App Router best practices
 * Calls MCP gateway directly instead of going through our own API
 */
async function loadMcpCapabilities() {
  try {
    const gatewayUrl = process.env.MCP_GATEWAY_URL || "http://localhost:37373";
    const apiKey = process.env.MCP_API_KEY;

    if (!apiKey) {
      console.warn(
        "MCP_API_KEY not found, skipping server-side capability loading"
      );
      return null;
    }

    // Call gateway directly with JSON-RPC
    const [toolsResponse, promptsResponse, resourcesResponse] =
      await Promise.all([
        fetch(`${gatewayUrl}/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: `server_tools_${Date.now()}`,
            method: "tools/list",
            params: {},
          }),
        }),
        fetch(`${gatewayUrl}/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: `server_prompts_${Date.now()}`,
            method: "prompts/list",
            params: {},
          }),
        }),
        fetch(`${gatewayUrl}/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: `server_resources_${Date.now()}`,
            method: "resources/list",
            params: {},
          }),
        }),
      ]);

    const [tools, prompts, resources] = await Promise.all([
      toolsResponse.ok ? toolsResponse.json() : { result: { tools: [] } },
      promptsResponse.ok ? promptsResponse.json() : { result: { prompts: [] } },
      resourcesResponse.ok
        ? resourcesResponse.json()
        : { result: { resources: [] } },
    ]);

    return {
      operations: ["tool", "prompt", "resource", "health"],
      tools: tools.result?.tools || [],
      prompts: prompts.result?.prompts || [],
      resources: resources.result?.resources || [],
      healthTargets: ["gateway", "linear", "perplexity", "devtools"],
    };
  } catch (error) {
    console.error("Failed to load MCP capabilities on server:", error);
    // Return null for graceful degradation - the view can handle this
    return null;
  }
}
