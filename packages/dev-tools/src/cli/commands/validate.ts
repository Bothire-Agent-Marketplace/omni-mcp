import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { log, logError, logSuccess, logWarning } from "../utils.js";

type ValidationResult = "pass" | "warn" | "fail";
interface Check {
  description: string;
  fn: () => Promise<ValidationResult>;
}

export const validate = new Command("validate")
  .description("🔍 Validate MCP server compliance with the HTTP pattern")
  .argument(
    "[service-name]",
    "Name of the service to validate (e.g., 'linear')"
  )
  .action(async (serviceName) => {
    log("🔍 Validating MCP Server Compliance");
    log("===================================");

    const serversDir = path.resolve(process.cwd(), "apps");
    if (!fs.existsSync(serversDir)) {
      logError("❌ No apps directory found at ./apps");
      return;
    }

    const serversToValidate = serviceName
      ? [serviceName]
      : fs
          .readdirSync(serversDir)
          .filter((dir) => dir.endsWith("-mcp-server"))
          .map((dir) => dir.replace("-mcp-server", ""));

    if (serversToValidate.length === 0) {
      logWarning("No servers found to validate.");
      return;
    }

    let allPassed = true;
    for (const name of serversToValidate) {
      log(`\n🚀 Validating '${name}'...`);
      const success = await runValidationChecks(name);
      if (!success) {
        allPassed = false;
      }
    }

    log("\n-------------------");
    if (allPassed) {
      logSuccess("✅ All servers passed validation!");
    } else {
      logError("❌ Some servers failed validation.");
      process.exit(1);
    }
  });

async function runValidationChecks(serviceName: string): Promise<boolean> {
  const serverId = `${serviceName}-mcp-server`;
  const serverPath = path.resolve(process.cwd(), "apps", serverId);

  const checks: Check[] = [
    {
      description: "Required file 'src/mcp-server/http-server.ts' exists",
      fn: async () =>
        checkFileExists(path.join(serverPath, "src/mcp-server/http-server.ts")),
    },
    {
      description: "Required file 'src/mcp-server/handlers.ts' exists",
      fn: async () =>
        checkFileExists(path.join(serverPath, "src/mcp-server/handlers.ts")),
    },
    {
      description: "'package.json' contains 'fastify' dependency",
      fn: async () => checkPackageDependency(serverPath, "fastify"),
    },
    {
      description: "'package.json' dev script uses 'tsx'",
      fn: async () => checkPackageScript(serverPath, "dev", "tsx"),
    },
    {
      description: "Is configured in 'packages/utils/src/env.ts'",
      fn: async () => checkEnvTsConfig(serviceName),
    },
    {
      description: "Is configured in 'pnpm-workspace.yaml'",
      fn: async () => checkPnpmWorkspace(`apps/${serverId}`),
    },
    {
      description: "'http-server.ts' imports 'fastify'",
      fn: async () =>
        checkHttpServerImports(
          path.join(serverPath, "src/mcp-server/http-server.ts"),
          "fastify"
        ),
    },
  ];

  let passedCount = 0;
  for (const check of checks) {
    const result = await check.fn();
    let icon = "❓";
    if (result === "pass") {
      icon = "✅";
      passedCount++;
    }
    if (result === "warn") icon = "⚠️";
    if (result === "fail") icon = "❌";

    log(` ${icon} ${check.description}`);
  }

  const success = passedCount === checks.length;
  if (success) {
    logSuccess("  └─ All checks passed!");
  } else {
    logError(`  └─ Passed ${passedCount}/${checks.length} checks.`);
  }

  return success;
}

// CHECK IMPLEMENTATIONS
async function checkFileExists(filePath: string): Promise<ValidationResult> {
  return fs.existsSync(filePath) ? "pass" : "fail";
}

async function checkPackageDependency(
  serverPath: string,
  depName: string
): Promise<ValidationResult> {
  const pkgPath = path.join(serverPath, "package.json");
  if (!fs.existsSync(pkgPath)) return "fail";
  const pkg = await fs.readJson(pkgPath);
  return pkg.dependencies?.[depName] ? "pass" : "fail";
}

async function checkPackageScript(
  serverPath: string,
  scriptName: string,
  expectedContent: string
): Promise<ValidationResult> {
  const pkgPath = path.join(serverPath, "package.json");
  if (!fs.existsSync(pkgPath)) return "fail";
  const pkg = await fs.readJson(pkgPath);
  return pkg.scripts?.[scriptName]?.includes(expectedContent) ? "pass" : "fail";
}

async function checkEnvTsConfig(
  serviceName: string
): Promise<ValidationResult> {
  const configPath = path.resolve(process.cwd(), "packages/utils/src/env.ts");
  if (!fs.existsSync(configPath)) return "fail";
  const content = await fs.readFile(configPath, "utf8");
  const regex = new RegExp(`['"]?${serviceName}['"]?:\\s*\\{`);
  return regex.test(content) ? "pass" : "fail";
}

async function checkPnpmWorkspace(
  serverPath: string
): Promise<ValidationResult> {
  const workspacePath = path.resolve(process.cwd(), "pnpm-workspace.yaml");
  if (!fs.existsSync(workspacePath)) return "fail";
  const workspace = yaml.load(await fs.readFile(workspacePath, "utf8")) as {
    packages: string[];
  };

  for (const pattern of workspace.packages || []) {
    if (pattern === serverPath) {
      return "pass";
    }
    if (
      pattern.endsWith("/*") &&
      serverPath.startsWith(pattern.slice(0, -2) + "/")
    ) {
      return "pass";
    }
  }

  return "fail";
}

async function checkHttpServerImports(
  httpPath: string,
  importName: string
): Promise<ValidationResult> {
  if (!fs.existsSync(httpPath)) return "fail";
  const content = await fs.readFile(httpPath, "utf8");
  return content.includes(`from "fastify"`) ? "pass" : "fail";
}
