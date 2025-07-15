import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default MCP servers
  const mcpServers = [
    {
      serverKey: "devtools",
      name: "Development Tools",
      description: "Browser automation and testing tools",
      capabilities: [
        "browser_automation",
        "network_monitoring",
        "console_access",
        "performance_profiling",
        "debugging_tools",
      ],
      isActive: true,
    },
    {
      serverKey: "linear",
      name: "Linear Integration",
      description: "Issue tracking and project management",
      capabilities: [
        "issue_management",
        "project_queries",
        "team_collaboration",
        "workflow_automation",
        "reporting",
      ],
      isActive: true,
    },
    {
      serverKey: "perplexity",
      name: "Perplexity AI",
      description: "AI-powered search and research",
      capabilities: [
        "web_search",
        "research_synthesis",
        "content_analysis",
        "fact_checking",
        "comparative_analysis",
      ],
      isActive: true,
    },
  ];

  console.log("📦 Creating MCP servers...");
  for (const server of mcpServers) {
    const existingServer = await prisma.mcpServer.findUnique({
      where: { serverKey: server.serverKey },
    });

    if (!existingServer) {
      await prisma.mcpServer.create({
        data: server,
      });
      console.log(`✅ Created MCP server: ${server.name}`);
    } else {
      // Update existing server
      await prisma.mcpServer.update({
        where: { serverKey: server.serverKey },
        data: {
          name: server.name,
          description: server.description,
          capabilities: server.capabilities,
          isActive: server.isActive,
        },
      });
      console.log(`🔄 Updated MCP server: ${server.name}`);
    }
  }

  // Create a sample organization for testing (optional)
  if (process.env.NODE_ENV === "development") {
    const testOrg = await prisma.organization.findUnique({
      where: { slug: "test-org" },
    });

    if (!testOrg) {
      const newOrg = await prisma.organization.create({
        data: {
          clerkId: "test-clerk-org-id",
          name: "Test Organization",
          slug: "test-org",
          metadata: {
            description: "Test organization for development",
          },
        },
      });

      console.log("🧪 Created test organization:", newOrg.name);

      // Enable all services for test organization
      const servers = await prisma.mcpServer.findMany({
        where: { isActive: true },
      });

      for (const server of servers) {
        await prisma.organizationService.create({
          data: {
            organizationId: newOrg.id,
            mcpServerId: server.id,
            enabled: true,
            configuration: {},
          },
        });
      }

      console.log("🔧 Enabled all services for test organization");
    }
  }

  console.log("✅ Database seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Database seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
