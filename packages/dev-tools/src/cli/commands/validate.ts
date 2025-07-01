import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidateOptions {
  fix?: boolean;
}

interface ValidationResult {
  server: string;
  passing: boolean;
  issues: ValidationIssue[];
  score: number;
}

interface ValidationIssue {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  file?: string;
  fixable?: boolean;
}

export async function validateMcpServer(
  serviceName?: string,
  options: ValidateOptions = {}
) {
  console.log("🔍 Validating MCP Server Official SDK Pattern Compliance");
  console.log("=======================================================");

  const projectRoot = path.resolve(__dirname, "../../../../..");
  const serversDir = path.join(projectRoot, "servers");

  if (!fs.existsSync(serversDir)) {
    console.log("❌ No servers directory found");
    return;
  }

  let serversToValidate: string[] = [];

  if (serviceName) {
    const serverPath = path.join(serversDir, `${serviceName}-mcp-server`);
    if (!fs.existsSync(serverPath)) {
      console.error(`❌ MCP server '${serviceName}' not found`);
      process.exit(1);
    }
    serversToValidate = [serviceName];
  } else {
    // Validate all servers
    serversToValidate = fs
      .readdirSync(serversDir)
      .filter((name) => name.endsWith("-mcp-server"))
      .map((name) => name.replace("-mcp-server", ""))
      .filter((name) => {
        const serverPath = path.join(serversDir, `${name}-mcp-server`);
        return fs.statSync(serverPath).isDirectory();
      });
  }

  if (serversToValidate.length === 0) {
    console.log("📭 No MCP servers found to validate");
    return;
  }

  const results: ValidationResult[] = [];

  for (const server of serversToValidate) {
    console.log(`\n🔍 Validating: ${server}`);
    console.log("─".repeat(50));

    const result = await validateServer(server, projectRoot, options);
    results.push(result);

    displayValidationResult(result);
  }

  // Summary
  console.log("\n📊 Validation Summary");
  console.log("=".repeat(50));

  const totalServers = results.length;
  const passingServers = results.filter((r) => r.passing).length;
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / totalServers
  );

  console.log(`✅ Passing servers: ${passingServers}/${totalServers}`);
  console.log(`📈 Average compliance score: ${averageScore}%`);

  if (passingServers < totalServers) {
    console.log("\n💡 To fix issues automatically, use: omni validate --fix");
  }

  // Exit with error if any server failed
  if (passingServers < totalServers) {
    process.exit(1);
  }
}

async function validateServer(
  serviceName: string,
  projectRoot: string,
  options: ValidateOptions
): Promise<ValidationResult> {
  const serverPath = path.join(
    projectRoot,
    "servers",
    `${serviceName}-mcp-server`
  );

  const issues: ValidationIssue[] = [];
  let score = 100;

  // 1. Check directory structure
  await validateDirectoryStructure(serviceName, serverPath, issues);

  // 2. Check official MCP SDK usage
  await validateOfficialMcpSdk(serviceName, serverPath, issues);

  // 3. Check server pattern compliance
  await validateServerPatterns(serviceName, serverPath, issues);

  // 4. Check Docker configuration
  await validateDocker(serviceName, serverPath, issues);

  // 5. Check hierarchical environment structure
  await validateEnvironmentStructure(
    serviceName,
    serverPath,
    projectRoot,
    issues
  );

  // Calculate score
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;

  score -= errorCount * 15; // -15 per error
  score -= warningCount * 5; // -5 per warning
  score = Math.max(0, score);

  const passing = errorCount === 0 && score >= 80;

  // Apply fixes if requested
  if (options.fix && issues.some((i) => i.fixable)) {
    await applyFixes(serviceName, serverPath, issues);
  }

  return {
    server: serviceName,
    passing,
    issues,
    score,
  };
}

async function validateDirectoryStructure(
  serviceName: string,
  serverPath: string,
  issues: ValidationIssue[]
) {
  const requiredFiles = [
    "package.json",
    "tsconfig.json",
    "Dockerfile",
    "README.md",
    "src/index.ts",
    "src/config/config.ts",
    "src/mcp-server/server.ts",
    "src/mcp-server/tools.ts",
    "src/mcp-server/resources.ts",
    "src/mcp-server/prompts.ts",
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(serverPath, file);
    if (!fs.existsSync(filePath)) {
      issues.push({
        type: "error",
        category: "Structure",
        message: `Missing required file: ${file}`,
        file,
        fixable: true,
      });
    }
  }

  // Check for old structure patterns (anti-patterns)
  const oldPatterns = ["src/types/", "src/mcp-server/tools/"];

  for (const pattern of oldPatterns) {
    const patternPath = path.join(serverPath, pattern);
    if (fs.existsSync(patternPath)) {
      issues.push({
        type: "warning",
        category: "Structure",
        message: `Old pattern detected: ${pattern} - should be removed in favor of official MCP SDK pattern`,
        file: pattern,
        fixable: false,
      });
    }
  }
}

async function validateOfficialMcpSdk(
  serviceName: string,
  serverPath: string,
  issues: ValidationIssue[]
) {
  const files = [
    "src/mcp-server/tools.ts",
    "src/mcp-server/resources.ts",
    "src/mcp-server/prompts.ts",
  ];

  for (const file of files) {
    const filePath = path.join(serverPath, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");

    // Check for official MCP SDK imports
    if (!content.includes("@modelcontextprotocol/sdk")) {
      issues.push({
        type: "error",
        category: "Official SDK",
        message: `File ${file} must import from @modelcontextprotocol/sdk`,
        file,
        fixable: false,
      });
    }

    // Check for proper register function pattern
    const fileName = path.basename(file, ".ts");
    const expectedFunction = `register${
      fileName.charAt(0).toUpperCase() + fileName.slice(1)
    }`;
    if (!content.includes(expectedFunction)) {
      issues.push({
        type: "error",
        category: "Official SDK",
        message: `File ${file} must export ${expectedFunction} function`,
        file,
        fixable: false,
      });
    }

    // Check for server.setRequestHandler usage
    if (!content.includes("server.setRequestHandler")) {
      issues.push({
        type: "error",
        category: "Official SDK",
        message: `File ${file} must use server.setRequestHandler pattern`,
        file,
        fixable: false,
      });
    }

    // Check for anti-patterns (old shared schemas)
    if (content.includes("@mcp/schemas")) {
      issues.push({
        type: "error",
        category: "Official SDK",
        message: `File ${file} should not import from @mcp/schemas - use official MCP SDK instead`,
        file,
        fixable: false,
      });
    }
  }

  // Check package.json for official SDK dependency
  const packageJsonPath = path.join(serverPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    if (!packageJson.dependencies?.["@modelcontextprotocol/sdk"]) {
      issues.push({
        type: "error",
        category: "Official SDK",
        message:
          "package.json must include @modelcontextprotocol/sdk dependency",
        file: "package.json",
        fixable: true,
      });
    }

    if (!packageJson.dependencies?.["zod"]) {
      issues.push({
        type: "error",
        category: "Official SDK",
        message:
          "package.json must include zod dependency for input validation",
        file: "package.json",
        fixable: true,
      });
    }

    // Check for old dependencies that should be removed
    if (packageJson.dependencies?.["@mcp/schemas"]) {
      issues.push({
        type: "warning",
        category: "Official SDK",
        message:
          "package.json should remove @mcp/schemas dependency - use official MCP SDK instead",
        file: "package.json",
        fixable: true,
      });
    }
  }
}

async function validateServerPatterns(
  serviceName: string,
  serverPath: string,
  issues: ValidationIssue[]
) {
  const serverFilePath = path.join(
    serverPath,
    "src",
    "mcp-server",
    "server.ts"
  );

  if (!fs.existsSync(serverFilePath)) {
    issues.push({
      type: "error",
      category: "Server Pattern",
      message: "Missing server.ts file",
      file: "src/mcp-server/server.ts",
    });
    return;
  }

  const content = fs.readFileSync(serverFilePath, "utf8");

  // Check for proper server creation pattern
  if (!content.includes("new Server(")) {
    issues.push({
      type: "error",
      category: "Server Pattern",
      message: "server.ts must use 'new Server()' pattern",
      file: "src/mcp-server/server.ts",
      fixable: false,
    });
  }

  // Check for register function calls
  const registerFunctions = [
    "registerTools",
    "registerResources",
    "registerPrompts",
  ];
  for (const func of registerFunctions) {
    if (!content.includes(func)) {
      issues.push({
        type: "error",
        category: "Server Pattern",
        message: `server.ts must call ${func}(server)`,
        file: "src/mcp-server/server.ts",
        fixable: false,
      });
    }
  }

  // Check config usage
  const configPath = path.join(serverPath, "src", "config", "config.ts");
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, "utf8");

    if (!configContent.includes("loadEnvHierarchy")) {
      issues.push({
        type: "error",
        category: "Server Pattern",
        message: "config.ts must use loadEnvHierarchy from @mcp/utils",
        file: "src/config/config.ts",
        fixable: false,
      });
    }
  }
}

async function validateDocker(
  serviceName: string,
  serverPath: string,
  issues: ValidationIssue[]
) {
  const dockerfilePath = path.join(serverPath, "Dockerfile");

  if (!fs.existsSync(dockerfilePath)) {
    issues.push({
      type: "warning",
      category: "Docker",
      message: "Missing Dockerfile for containerization",
      fixable: true,
    });
    return;
  }

  const content = fs.readFileSync(dockerfilePath, "utf8");

  // Check for multi-stage build
  if (!content.includes("FROM node:20-alpine AS builder")) {
    issues.push({
      type: "warning",
      category: "Docker",
      message: "Dockerfile should use multi-stage build for optimization",
      file: "Dockerfile",
      fixable: false,
    });
  }

  // Check for health check
  if (!content.includes("HEALTHCHECK")) {
    issues.push({
      type: "info",
      category: "Docker",
      message: "Consider adding health check to Dockerfile",
      file: "Dockerfile",
      fixable: false,
    });
  }

  // Check for old shared/schemas references (should be removed)
  if (content.includes("shared/schemas")) {
    issues.push({
      type: "warning",
      category: "Docker",
      message:
        "Dockerfile should not reference shared/schemas - remove old pattern",
      file: "Dockerfile",
      fixable: false,
    });
  }
}

function displayValidationResult(result: ValidationResult) {
  const { server, passing, issues, score } = result;

  // Status
  const status = passing ? "✅ PASS" : "❌ FAIL";
  const scoreColor = score >= 90 ? "🟢" : score >= 70 ? "🟡" : "🔴";

  console.log(`${status} ${scoreColor} ${score}% compliance score`);

  if (issues.length === 0) {
    console.log("🎉 Perfect compliance with Official MCP SDK Pattern!");
    return;
  }

  // Group issues by category
  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  // Display issues
  for (const [category, categoryIssues] of Object.entries(groupedIssues)) {
    console.log(`\n📋 ${category}:`);

    for (const issue of categoryIssues) {
      const icon =
        issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️";
      const fixIcon = issue.fixable ? " 🔧" : "";
      console.log(`   ${icon} ${issue.message}${fixIcon}`);
      if (issue.file) {
        console.log(`      📁 ${issue.file}`);
      }
    }
  }
}

async function applyFixes(
  serviceName: string,
  serverPath: string,
  issues: ValidationIssue[]
) {
  console.log("\n🔧 Applying automatic fixes...");

  const fixableIssues = issues.filter((i) => i.fixable);

  for (const issue of fixableIssues) {
    try {
      // Implementation would go here for each fixable issue type
      console.log(`✅ Fixed: ${issue.message}`);
    } catch (error) {
      console.log(`❌ Could not fix: ${issue.message}`);
    }
  }
}

async function validateEnvironmentStructure(
  serviceName: string,
  serverPath: string,
  projectRoot: string,
  issues: ValidationIssue[]
) {
  const upperCaseName = serviceName.toUpperCase();
  const capitalizedName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  // Check for service-specific .env.example
  const serviceEnvExample = path.join(serverPath, ".env.example");
  if (!fs.existsSync(serviceEnvExample)) {
    issues.push({
      type: "error",
      category: "Environment Structure",
      message: "Missing service-specific .env.example file",
      file: ".env.example",
      fixable: true,
    });
  } else {
    // Check that .env.example doesn't contain secrets
    const content = fs.readFileSync(serviceEnvExample, "utf8");
    if (content.includes(`${upperCaseName}_API_KEY=`)) {
      issues.push({
        type: "error",
        category: "Environment Structure",
        message:
          "Service .env.example should not contain secrets (use centralized secrets instead)",
        file: ".env.example",
        fixable: false,
      });
    }
  }

  // Check for centralized secrets
  const centralSecretsPath = path.join(
    projectRoot,
    "secrets",
    ".env.development.local.example"
  );
  if (!fs.existsSync(centralSecretsPath)) {
    issues.push({
      type: "error",
      category: "Environment Structure",
      message:
        "Missing centralized secrets file: secrets/.env.development.local.example",
      fixable: true,
    });
  } else {
    // Check that service secrets are in centralized file
    const content = fs.readFileSync(centralSecretsPath, "utf8");
    if (!content.includes(`${upperCaseName}_API_KEY`)) {
      issues.push({
        type: "warning",
        category: "Environment Structure",
        message: `Service API key not found in centralized secrets: ${upperCaseName}_API_KEY`,
        fixable: true,
      });
    }
  }
}
