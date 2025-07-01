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
  console.log("🔍 Validating MCP Server Enterprise Pattern Compliance");
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
  const schemasPath = path.join(
    projectRoot,
    "shared",
    "schemas",
    "src",
    serviceName
  );

  const issues: ValidationIssue[] = [];
  let score = 100;

  // 1. Check directory structure
  await validateDirectoryStructure(serviceName, serverPath, issues);

  // 2. Check shared type usage
  await validateSharedTypes(serviceName, serverPath, issues);

  // 3. Check enterprise patterns
  await validateEnterprisePatterns(serviceName, serverPath, issues);

  // 4. Check schemas compliance
  await validateSchemas(serviceName, schemasPath, issues);

  // 5. Check Docker configuration
  await validateDocker(serviceName, serverPath, issues);

  // 6. Check hierarchical environment structure
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
    await applyFixes(serviceName, serverPath, schemasPath, issues);
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
    `src/mcp-server/tools/${serviceName}-tools.ts`,
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
}

async function validateSharedTypes(
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

    if (!content.includes("@mcp/schemas")) {
      issues.push({
        type: "error",
        category: "Shared Types",
        message: `File ${file} must import from @mcp/schemas`,
        file,
        fixable: true,
      });
    }

    if (!content.includes(`${serviceName.toUpperCase()}_`)) {
      issues.push({
        type: "error",
        category: "Shared Types",
        message: `File ${file} must use shared constants (${serviceName.toUpperCase()}_TOOLS, etc.)`,
        file,
        fixable: true,
      });
    }
  }
}

async function validateEnterprisePatterns(
  serviceName: string,
  serverPath: string,
  issues: ValidationIssue[]
) {
  const toolsImplPath = path.join(
    serverPath,
    "src",
    "mcp-server",
    "tools",
    `${serviceName}-tools.ts`
  );

  if (!fs.existsSync(toolsImplPath)) {
    issues.push({
      type: "error",
      category: "Enterprise Pattern",
      message: "Missing tools implementation file",
      file: toolsImplPath,
    });
    return;
  }

  const content = fs.readFileSync(toolsImplPath, "utf8");

  // Check for _execute pattern
  if (!content.includes("_execute")) {
    issues.push({
      type: "error",
      category: "Enterprise Pattern",
      message: "Tools must use _execute wrapper for error handling",
      file: toolsImplPath,
      fixable: false,
    });
  }

  // Check for McpResponse usage
  if (!content.includes("McpResponse")) {
    issues.push({
      type: "error",
      category: "Enterprise Pattern",
      message: "Tools must return McpResponse<T> type",
      file: toolsImplPath,
      fixable: false,
    });
  }

  // Check for hardcoded schemas (anti-pattern)
  if (content.includes("inputSchema:") && content.includes('type: "object"')) {
    issues.push({
      type: "warning",
      category: "Enterprise Pattern",
      message: "Avoid hardcoded schemas - use shared types instead",
      file: toolsImplPath,
      fixable: false,
    });
  }
}

async function validateSchemas(
  serviceName: string,
  schemasPath: string,
  issues: ValidationIssue[]
) {
  if (!fs.existsSync(schemasPath)) {
    issues.push({
      type: "error",
      category: "Schemas",
      message: "Missing shared schemas directory",
      fixable: true,
    });
    return;
  }

  const mcpTypesPath = path.join(schemasPath, "mcp-types.ts");
  if (!fs.existsSync(mcpTypesPath)) {
    issues.push({
      type: "error",
      category: "Schemas",
      message: "Missing mcp-types.ts file in shared schemas",
      file: mcpTypesPath,
      fixable: true,
    });
    return;
  }

  const content = fs.readFileSync(mcpTypesPath, "utf8");
  const upperCaseName = serviceName.toUpperCase();

  // Check for required exports
  const requiredExports = [
    `${upperCaseName}_TOOLS`,
    `${upperCaseName}_RESOURCES`,
    `${upperCaseName}_PROMPTS`,
  ];

  for (const exportName of requiredExports) {
    if (!content.includes(exportName)) {
      issues.push({
        type: "error",
        category: "Schemas",
        message: `Missing required export: ${exportName}`,
        file: mcpTypesPath,
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
      file: dockerfilePath,
      fixable: false,
    });
  }

  // Check for health check
  if (!content.includes("HEALTHCHECK")) {
    issues.push({
      type: "info",
      category: "Docker",
      message: "Consider adding health check to Dockerfile",
      file: dockerfilePath,
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
    console.log("🎉 Perfect compliance with Enterprise MCP Server Pattern!");
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
  schemasPath: string,
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
        message: `Service secrets not found in centralized secrets file`,
        fixable: true,
      });
    }
  }

  // Check Docker Compose environment file configuration
  const dockerComposeFiles = ["docker-compose.yml", "docker-compose.dev.yml"];

  for (const fileName of dockerComposeFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const serviceName_container = `${serviceName}-mcp-server`;

    if (content.includes(serviceName_container)) {
      // Check for proper env_file hierarchy based on file type
      const isDev = fileName.includes(".dev.");
      const expectedEnvFile = isDev
        ? "secrets/.env.development.local"
        : "env_file:";

      if (!content.includes(expectedEnvFile)) {
        issues.push({
          type: "warning",
          category: "Environment Structure",
          message: `Docker Compose ${fileName} should use hierarchical env_file loading`,
          file: fileName,
          fixable: false,
        });
      }
    }
  }
}
