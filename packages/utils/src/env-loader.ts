import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { config } from "dotenv";
import type { Environment } from "./validation.js";

// Re-export Environment type for convenience
export type { Environment };

/**
 * Detects the current runtime environment.
 * Defaults to 'development' if NODE_ENV is not set.
 */
export function detectEnvironment(): Environment {
  const env = process.env.NODE_ENV as Environment;
  if (["development", "production", "test"].includes(env)) {
    return env;
  }
  return "development";
}

/**
 * Finds the project root by searching for the `pnpm-workspace.yaml` file.
 */
function findProjectRoot(startPath: string): string {
  let currentPath = startPath;
  while (currentPath !== dirname(currentPath)) {
    if (existsSync(join(currentPath, "pnpm-workspace.yaml"))) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }
  throw new Error(
    "Could not find project root. Is `pnpm-workspace.yaml` present?"
  );
}

function loadEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    const result = config({ path: filePath, override: true });
    if (result.error) {
      console.warn(`⚠️  Could not load ${filePath}: ${result.error.message}`);
    } else {
      console.log(`✅ Loaded environment from: ${filePath}`);
    }
  }
}

/**
 * Loads all relevant .env files for a given service.
 * The loading order ensures correct precedence.
 */
export function loadEnvironment(servicePath: string): void {
  const environment = detectEnvironment();
  const projectRoot = findProjectRoot(servicePath);
  const serviceName = getServiceName(servicePath);

  console.log(
    `🔧 Loading environment for service: ${serviceName || "unknown"} at ${servicePath}`
  );

  const pathsToLoad = [
    // 1. Root .env files
    join(projectRoot, ".env"),
    join(projectRoot, `.env.${environment}`),

    // 2. Central secrets file
    join(projectRoot, "secrets", `.env.${environment}.local`),

    // 3. Service-specific .env files
    join(servicePath, ".env"),
    join(servicePath, `.env.${environment}`),
    join(servicePath, ".env.local"),
    join(servicePath, `.env.${environment}.local`),

    // 4. Root local override (lowest precedence)
    join(projectRoot, ".env.local"),
  ];

  [...new Set(pathsToLoad)].forEach((path) => loadEnvFile(path));
}

function getServiceName(servicePath: string): string | null {
  try {
    const packageJsonPath = join(servicePath, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return packageJson.name.split("/").pop() || null;
    }
  } catch {
    // If .env file doesn't exist, that's fine - we'll use defaults
  }
  return null;
}
