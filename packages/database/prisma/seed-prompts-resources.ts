import { PrismaClient } from "../generated/index.js";

const prisma = new PrismaClient();

const DEFAULT_PROMPTS = {
  linear: [
    {
      name: "create_issue_workflow",
      description:
        "Step-by-step workflow for creating well-structured Linear issues",
      template: [
        {
          role: "user",
          content:
            "Help me create a well-structured Linear issue{{#if teamId}} for team {{teamId}}{{/if}}{{#if priority}} with priority {{priority}}{{/if}}. Please guide me through:\n\n1. Writing a clear, actionable title\n2. Creating a detailed description with acceptance criteria\n3. Setting appropriate priority and labels\n4. Assigning to the right team member\n\nLet's start with the issue title - what problem are we solving?",
        },
      ],

      arguments: {
        teamId: { type: "string", description: "Team ID", optional: true },
        priority: {
          type: "number",
          description: "Priority level",
          optional: true,
        },
      },
    },
    {
      name: "triage_workflow",
      description:
        "Comprehensive workflow for triaging and prioritizing Linear issues",
      template: [
        {
          role: "user",
          content:
            "Let's triage issues systematically. I'll help you:\n\n1. **Review Unassigned Issues**: Identify ownership\n2. **Assess Priority**: Determine urgency and importance\n3. **Estimate Complexity**: Size the work appropriately\n4. **Check Dependencies**: Identify blockers\n5. **Set Due Dates**: Based on priority and capacity\n\nLet's start - how many issues need triaging and what's your team's current capacity?",
        },
      ],

      arguments: {},
    },
    {
      name: "sprint_planning",
      description: "Sprint planning workflow using Linear issues and cycles",
      template: [
        {
          role: "user",
          content:
            "Let's plan an effective sprint{{#if teamId}} for team {{teamId}}{{/if}}{{#if sprintDuration}} ({{sprintDuration}} weeks){{/if}}. We'll cover:\n\n1. **Sprint Goal**: Defining clear objectives\n2. **Capacity Planning**: Understanding team availability\n3. **Issue Selection**: Choosing the right mix of work\n4. **Story Estimation**: Sizing issues appropriately\n5. **Dependencies**: Identifying blockers and prerequisites\n\nWhat's your sprint goal and what issues are you considering?",
        },
      ],

      arguments: {
        teamId: { type: "string", description: "Team ID", optional: true },
        sprintDuration: {
          type: "number",
          description: "Sprint duration in weeks",
          optional: true,
        },
      },
    },
  ],

  perplexity: [
    {
      name: "perplexity_workflow",
      description: "Standard perplexity workflow prompt",
      template: [
        {
          role: "user",
          content: "Please help me with this perplexity task: {{task}}",
        },
      ],

      arguments: {
        task: {
          type: "string",
          description: "Task description",
          optional: true,
        },
      },
    },
    {
      name: "perplexity_automation",
      description: "Automation prompt for perplexity",
      template: [
        {
          role: "user",
          content:
            "Guide me through automating: {{process}}. I need help with:\n\n1. Planning the automation workflow\n2. Setting up the necessary components\n3. Testing and validation\n4. Error handling and recovery\n\nWhat specific automation challenge are you facing?",
        },
      ],

      arguments: {
        process: {
          type: "string",
          description: "Process to automate",
          optional: true,
        },
      },
    },
  ],

  devtools: [
    {
      name: "devtools_workflow",
      description: "Step-by-step workflow for devtools tasks",
      template: [
        {
          role: "user",
          content:
            "Help me with this devtools task: {{task}}. Please guide me through:\n\n1. Understanding the requirements\n2. Planning the approach\n3. Implementing the solution\n4. Testing and validation\n\nLet's start - what specific aspect of devtools are we working on?",
        },
      ],

      arguments: {
        task: {
          type: "string",
          description: "Task description",
          optional: true,
        },
      },
    },
    {
      name: "devtools_automation",
      description: "Automation guidance for devtools processes",
      template: [
        {
          role: "user",
          content:
            "Let's automate this devtools process: {{process}}. We'll cover:\n\n1. **Current Process Analysis**: Understanding manual steps\n2. **Automation Design**: Planning the automated workflow\n3. **Tool Selection**: Choosing the right tools\n4. **Implementation**: Building the automation\n5. **Monitoring**: Setting up observability\n\nWhat's the current manual process you want to automate?",
        },
      ],

      arguments: {
        process: {
          type: "string",
          description: "Process name",
          optional: true,
        },
      },
    },
  ],
};

const DEFAULT_RESOURCES = {
  linear: [
    {
      uri: "linear://teams",
      name: "linear-teams",
      description: "List of all Linear teams",
      mimeType: "application/json",
      metadata: {
        refreshInterval: 300000,
        cacheable: true,
      },
    },
    {
      uri: "linear://users",
      name: "linear-users",
      description: "List of Linear users for assignment and collaboration",
      mimeType: "application/json",
      metadata: {
        refreshInterval: 300000,
        cacheable: true,
      },
    },
  ],

  perplexity: [
    {
      uri: "perplexity://search-history",
      name: "perplexity-search-history",
      description: "Access previous Perplexity search results",
      mimeType: "application/json",
      metadata: {
        maxItems: 100,
        cacheable: false,
      },
    },
    {
      uri: "perplexity://models",
      name: "perplexity-models",
      description: "List of available Perplexity models and their capabilities",
      mimeType: "application/json",
      metadata: {
        refreshInterval: 86400000,
        cacheable: true,
      },
    },
  ],

  devtools: [
    {
      uri: "chrome://session",
      name: "chrome-session",
      description: "Current Chrome debugging session data",
      mimeType: "application/json",
      metadata: {
        realtime: true,
        cacheable: false,
      },
    },
    {
      uri: "chrome://browser",
      name: "chrome-browser",
      description: "Chrome browser instance information",
      mimeType: "application/json",
      metadata: {
        refreshInterval: 60000,
        cacheable: true,
      },
    },
  ],
};

async function seedPromptsAndResources() {
  console.log("🌱 Starting prompts and resources seed...");

  try {
    const servers = await prisma.mcpServer.findMany();
    const serverMap = new Map(servers.map((s) => [s.serverKey, s]));

    for (const [serverKey, prompts] of Object.entries(DEFAULT_PROMPTS)) {
      const server = serverMap.get(serverKey);
      if (!server) {
        console.warn(`⚠️  Server ${serverKey} not found, skipping prompts`);
        continue;
      }

      console.log(`📝 Seeding prompts for ${serverKey}...`);
      for (const prompt of prompts) {
        await prisma.defaultPrompt.upsert({
          where: {
            mcpServerId_name: {
              mcpServerId: server.id,
              name: prompt.name,
            },
          },
          update: {
            description: prompt.description,
            template: prompt.template,
            arguments: prompt.arguments,
            updatedAt: new Date(),
          },
          create: {
            mcpServerId: server.id,
            name: prompt.name,
            description: prompt.description,
            template: prompt.template,
            arguments: prompt.arguments,
          },
        });
        console.log(`  ✅ ${prompt.name}`);
      }
    }

    for (const [serverKey, resources] of Object.entries(DEFAULT_RESOURCES)) {
      const server = serverMap.get(serverKey);
      if (!server) {
        console.warn(`⚠️  Server ${serverKey} not found, skipping resources`);
        continue;
      }

      console.log(`📚 Seeding resources for ${serverKey}...`);
      for (const resource of resources) {
        await prisma.defaultResource.upsert({
          where: {
            mcpServerId_uri: {
              mcpServerId: server.id,
              uri: resource.uri,
            },
          },
          update: {
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            metadata: resource.metadata,
            updatedAt: new Date(),
          },
          create: {
            mcpServerId: server.id,
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            metadata: resource.metadata,
          },
        });
        console.log(`  ✅ ${resource.uri}`);
      }
    }

    console.log("\n✨ Prompts and resources seed completed!");

    const promptCount = await prisma.defaultPrompt.count();
    const resourceCount = await prisma.defaultResource.count();
    console.log(`\n📊 Summary:`);
    console.log(`  - Default prompts: ${promptCount}`);
    console.log(`  - Default resources: ${resourceCount}`);
  } catch (error) {
    console.error("❌ Error seeding prompts and resources:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPromptsAndResources().catch((error) => {
  console.error(error);
  process.exit(1);
});
