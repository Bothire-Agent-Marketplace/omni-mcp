import { config } from "dotenv";
import { join, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { MasterConfig } from "@mcp/schemas";

export type Environment = "development" | "production" | "test";

export interface EnvironmentConfig {
  NODE_ENV: Environment;
  LOG_LEVEL: string;

  // Gateway
  GATEWAY_PORT: number;
  GATEWAY_HOST: string;
  GATEWAY_URL: string; // Full URL for production

  // Database
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_SSL: boolean;
  DATABASE_URL?: string; // For Vercel deployment

  // MCP Servers
  LINEAR_API_KEY: string;
  LINEAR_SERVER_URL: string;
  QUERYQUILL_SERVER_URL: string;

  // Security
  JWT_SECRET: string;
  MCP_API_KEY: string;
  API_RATE_LIMIT: number;
  ALLOWED_ORIGINS: string[];

  // Production Security
  REQUIRE_API_KEY: boolean;
  ENABLE_RATE_LIMITING: boolean;
  MAX_REQUEST_SIZE: string;
  CORS_CREDENTIALS: boolean;

  // MCP Configuration
  MCP_HANDSHAKE_TIMEOUT: number;
  SESSION_TIMEOUT: number;
  MAX_CONCURRENT_SESSIONS: number;

  // Vercel Deployment
  VERCEL_ENV?: string;
  VERCEL_URL?: string;

  // Optional timezone
  TZ?: string;
}

// MCP Server Configuration (environment-based)
export interface MCPServerConfig {
  type: "mcp";
  url: string;
  capabilities: string[];
  description: string;
  healthCheckInterval: number;
  requiresAuth?: boolean;
  maxRetries?: number;
}

export interface MCPServersConfig {
  [key: string]: MCPServerConfig;
}

export function getMCPServersConfig(env: Environment): MCPServersConfig {
  if (env === "production") {
    // Production URLs - these should be set via environment variables
    return {
      linear: {
        type: "mcp",
        url: process.env.LINEAR_SERVER_URL || "https://linear-mcp.vercel.app",
        capabilities: [
          "linear_search_issues",
          "linear_get_teams",
          "linear_get_users",
          "linear_get_projects",
          "linear_get_issue",
        ],
        description: "Linear MCP Server for issue tracking",
        healthCheckInterval: 30000,
        requiresAuth: true,
        maxRetries: 3,
      },
      queryQuill: {
        type: "mcp",
        url:
          process.env.QUERYQUILL_SERVER_URL ||
          "https://queryquill-mcp.vercel.app",
        capabilities: [
          "customer_lookup",
          "film_inventory",
          "rental_analysis",
          "payment_investigation",
          "business_analytics",
          "database_health",
        ],
        description: "MCP Server for querying the Pagila database",
        healthCheckInterval: 30000,
        requiresAuth: true,
        maxRetries: 3,
      },
    };
  }

  // Development configuration
  return {
    linear: {
      type: "mcp",
      url: "http://localhost:3001",
      capabilities: [
        "linear_search_issues",
        "linear_get_teams",
        "linear_get_users",
        "linear_get_projects",
        "linear_get_issue",
      ],
      description: "Linear MCP Server for issue tracking",
      healthCheckInterval: 15000,
      requiresAuth: false,
      maxRetries: 1,
    },
    queryQuill: {
      type: "mcp",
      url: "http://localhost:3002",
      capabilities: [
        "customer_lookup",
        "film_inventory",
        "rental_analysis",
        "payment_investigation",
        "business_analytics",
        "database_health",
      ],
      description: "MCP Server for querying the Pagila sample database",
      healthCheckInterval: 15000,
      requiresAuth: false,
      maxRetries: 1,
    },
  };
}

export interface GatewayConfig {
  port: number;
  host: string;
  allowedOrigins: string[];
  jwtSecret: string;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  rateLimitPerMinute: number;
  requireApiKey: boolean;
  enableRateLimit: boolean;
  maxRequestSizeMb: number;
  corsCredentials: boolean;
  securityHeaders: boolean;
}

export function getGatewayConfig(env: Environment): GatewayConfig {
  if (env === "production") {
    return {
      port: parseInt(process.env.GATEWAY_PORT || "443"),
      host: "0.0.0.0", // Vercel handles this
      allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      jwtSecret: process.env.JWT_SECRET || "",
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "3600000"),
      maxConcurrentSessions: parseInt(
        process.env.MAX_CONCURRENT_SESSIONS || "500"
      ),
      rateLimitPerMinute: parseInt(process.env.API_RATE_LIMIT || "100"),
      requireApiKey: process.env.REQUIRE_API_KEY === "true",
      enableRateLimit: process.env.ENABLE_RATE_LIMITING !== "false",
      maxRequestSizeMb: parseInt(process.env.MAX_REQUEST_SIZE || "1"),
      corsCredentials: process.env.CORS_CREDENTIALS !== "false",
      securityHeaders: true,
    };
  }

  // Development configuration
  return {
    port: 37373,
    host: "0.0.0.0",
    allowedOrigins: [
      "http://localhost:3000",
      "http://localhost:8080",
      "http://localhost:3001",
    ],
    jwtSecret: "dev-jwt-secret-change-in-production",
    sessionTimeout: 3600000, // 1 hour
    maxConcurrentSessions: 100,
    rateLimitPerMinute: 1000, // High limit for dev
    requireApiKey: false,
    enableRateLimit: false,
    maxRequestSizeMb: 10,
    corsCredentials: true,
    securityHeaders: false,
  };
}

class EnvironmentManager {
  private config: EnvironmentConfig;
  private environment: Environment;
  private projectRoot: string;

  constructor() {
    this.environment = this.detectEnvironment();
    this.projectRoot = this.findProjectRoot(process.cwd());
    this.loadEnvironmentFiles();
    this.config = this.buildConfig();
    this.validateConfig();
  }

  private detectEnvironment(): Environment {
    const env = process.env.NODE_ENV as Environment;
    if (["development", "production", "test"].includes(env)) {
      return env;
    }
    return "development"; // Default fallback
  }

  private findProjectRoot(startPath: string): string {
    let currentPath = startPath;
    while (currentPath !== dirname(currentPath)) {
      if (existsSync(join(currentPath, "pnpm-workspace.yaml"))) {
        return currentPath;
      }
      currentPath = dirname(currentPath);
    }
    console.warn("Could not find project root, defaulting to parent of cwd.");
    return dirname(process.cwd());
  }

  private loadEnvironmentFiles(): void {
    const serviceName = this.getServiceName();
    const serviceDir = this.getServiceDir();
    console.log(
      `🔧 Loading environment for service: ${serviceName || "unknown"}`
    );

    const pathsToLoad = [
      // 1. Root .env files
      join(this.projectRoot, ".env"),
      join(this.projectRoot, `.env.${this.environment}`),

      // 2. Central secrets file for the current environment
      join(this.projectRoot, "secrets", `.env.${this.environment}.local`),

      // 3. Root local override
      join(this.projectRoot, ".env.local"),
    ];

    if (serviceDir) {
      // 4. Service-type specific files (e.g., /servers/.env)
      const serviceTypePath = join(this.projectRoot, serviceDir);
      pathsToLoad.push(
        join(serviceTypePath, ".env"),
        join(serviceTypePath, `.env.${this.environment}`),
        join(serviceTypePath, ".env.local"),
        join(serviceTypePath, `.env.${this.environment}.local`)
      );
    }

    if (serviceDir && serviceName) {
      // 5. Service-instance specific files (e.g., /servers/linear-mcp-server/.env)
      const servicePath = join(this.projectRoot, serviceDir, serviceName);
      pathsToLoad.push(
        join(servicePath, ".env"),
        join(servicePath, `.env.${this.environment}`),
        join(servicePath, ".env.local"),
        join(servicePath, `.env.${this.environment}.local`)
      );
    }

    // Using a Set to remove duplicate paths, then loading them
    [...new Set(pathsToLoad)].forEach((path) => this.loadEnvFile(path));
  }

  private loadEnvFile(filePath: string): void {
    if (existsSync(filePath)) {
      const result = config({ path: filePath, override: true });
      if (result.error) {
        console.warn(`⚠️  Could not load ${filePath}: ${result.error.message}`);
      } else {
        console.log(`✅ Successfully loaded environment from: ${filePath}`);
      }
    }
  }

  private getServiceName(): string | null {
    try {
      const packageJsonPath = join(process.cwd(), "package.json");
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        const name = packageJson.name.split("/").pop();
        return name.replace("-server", "");
      }
    } catch (error) {
      console.warn(`Error reading package.json: ${error}`);
    }
    return null;
  }

  private getServiceDir(): string | null {
    const currentDir = process.cwd();
    if (currentDir.includes("/servers/")) return "servers";
    if (currentDir.endsWith("/gateway")) return "gateway";
    return null;
  }

  private buildConfig(): EnvironmentConfig {
    const isProduction = this.environment === "production";

    return {
      NODE_ENV: this.environment,
      LOG_LEVEL: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

      // Gateway
      GATEWAY_PORT: this.validatePort(
        process.env.GATEWAY_PORT || (isProduction ? "443" : "37373")
      ),
      GATEWAY_HOST:
        process.env.GATEWAY_HOST || (isProduction ? "0.0.0.0" : "0.0.0.0"),
      GATEWAY_URL:
        process.env.GATEWAY_URL ||
        (isProduction
          ? process.env.VERCEL_URL || ""
          : "http://localhost:37373"),

      // Database - Production uses DATABASE_URL, dev uses individual components
      POSTGRES_HOST: process.env.POSTGRES_HOST || "localhost",
      POSTGRES_PORT: this.validatePort(process.env.POSTGRES_PORT || "5432"),
      POSTGRES_DB: process.env.POSTGRES_DB || `omni_mcp_${this.environment}`,
      POSTGRES_USER: process.env.POSTGRES_USER || "postgres",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "postgres",
      POSTGRES_SSL: process.env.POSTGRES_SSL === "true" || isProduction,
      DATABASE_URL: process.env.DATABASE_URL,

      // MCP Servers
      LINEAR_API_KEY: this.decodeSecret(process.env.LINEAR_API_KEY || ""),
      LINEAR_SERVER_URL:
        process.env.LINEAR_SERVER_URL || "http://localhost:3001",
      QUERYQUILL_SERVER_URL:
        process.env.QUERYQUILL_SERVER_URL || "http://localhost:3002",

      // Security
      JWT_SECRET: this.validateSecret(
        process.env.JWT_SECRET || "dev-jwt-secret-change-in-production"
      ),
      MCP_API_KEY: this.validateSecret(
        process.env.MCP_API_KEY || "dev-api-key-change-in-production"
      ),
      API_RATE_LIMIT: parseInt(
        process.env.API_RATE_LIMIT || (isProduction ? "100" : "1000")
      ),
      ALLOWED_ORIGINS: this.parseOrigins(
        process.env.ALLOWED_ORIGINS ||
          (isProduction ? "" : "http://localhost:3000,http://localhost:8080")
      ),

      // Production Security
      REQUIRE_API_KEY: process.env.REQUIRE_API_KEY === "true" || isProduction,
      ENABLE_RATE_LIMITING:
        process.env.ENABLE_RATE_LIMITING === "true" || isProduction,
      MAX_REQUEST_SIZE:
        process.env.MAX_REQUEST_SIZE || (isProduction ? "1mb" : "10mb"),
      CORS_CREDENTIALS: process.env.CORS_CREDENTIALS !== "false",

      // MCP Configuration
      MCP_HANDSHAKE_TIMEOUT: this.validateTimeout(
        process.env.MCP_HANDSHAKE_TIMEOUT || "10000"
      ),
      SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || "3600000"), // 1 hour
      MAX_CONCURRENT_SESSIONS: parseInt(
        process.env.MAX_CONCURRENT_SESSIONS || (isProduction ? "500" : "100")
      ),

      // Vercel
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,

      // Optional
      TZ: process.env.TZ || "UTC",
    };
  }

  private parseOrigins(originsString: string): string[] {
    if (!originsString) return [];
    return originsString
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  // Enterprise-grade validation methods following security best practices
  private validatePort(port: string): number {
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 1024 || parsedPort > 65535) {
      throw new Error(
        `Invalid port number: ${port}. Must be between 1024-65535`
      );
    }
    return parsedPort;
  }

  private validateTimeout(timeout: string): number {
    const parsedTimeout = parseInt(timeout, 10);
    if (
      isNaN(parsedTimeout) ||
      parsedTimeout < 1000 ||
      parsedTimeout > 300000
    ) {
      throw new Error(
        `Invalid timeout: ${timeout}. Must be between 1000-300000ms`
      );
    }
    return parsedTimeout;
  }

  private validateSecret(secret: string): string {
    if (this.environment === "production") {
      if (secret.includes("dev-") || secret.includes("change-in-production")) {
        throw new Error(
          "Production secrets must not contain development placeholders"
        );
      }
      if (secret.length < 32) {
        throw new Error(
          "Production secrets must be at least 32 characters long"
        );
      }
    }
    return secret;
  }

  private decodeSecret(secret: string): string {
    if (!secret) return "";

    // Check if secret is base64 encoded (for security best practices)
    try {
      if (secret.match(/^[A-Za-z0-9+/]+=*$/)) {
        const decoded = Buffer.from(secret, "base64").toString("utf-8");
        // Validate decoded secret format (e.g., Linear API keys start with 'lin_api_')
        if (decoded.startsWith("lin_api_")) {
          return decoded;
        }
      }
    } catch (error) {
      // If decoding fails, treat as plain text
    }

    return secret;
  }

  private validateConfig(): void {
    const requiredVars: Array<keyof EnvironmentConfig> = [];

    // Only require LINEAR_API_KEY in development/production, not in test
    if (this.environment !== "test") {
      requiredVars.push("LINEAR_API_KEY");
    }

    const missing = requiredVars.filter((key) => !this.config[key]);

    if (missing.length > 0) {
      console.error(
        `❌ Missing required environment variables: ${missing.join(", ")}`
      );
      console.error(
        `📝 Please update .env.${this.environment}.local with the missing values`
      );

      if (this.environment === "production") {
        process.exit(1);
      } else {
        console.warn(
          `⚠️  Continuing in ${this.environment} mode with missing variables`
        );
      }
    }

    // Security validation for production
    if (this.environment === "production") {
      this.validateProductionSecurity();
    }
  }

  private validateProductionSecurity(): void {
    const securityChecks = [
      {
        check: this.config.JWT_SECRET !== "dev-jwt-secret-change-in-production",
        message: "JWT_SECRET must be changed from default in production",
      },
      {
        check: this.config.MCP_API_KEY !== "dev-api-key-change-in-production",
        message: "MCP_API_KEY must be changed from default in production",
      },
      {
        check: this.config.LINEAR_API_KEY !== "",
        message: "LINEAR_API_KEY is required in production",
      },
      {
        check: this.config.ALLOWED_ORIGINS.length > 0,
        message: "ALLOWED_ORIGINS must be specified in production",
      },
      {
        check:
          this.config.DATABASE_URL !== undefined ||
          (this.config.POSTGRES_HOST !== "localhost" &&
            this.config.POSTGRES_PASSWORD !== "postgres"),
        message:
          "Production database configuration required (DATABASE_URL or proper DB credentials)",
      },
      {
        check: this.config.JWT_SECRET.length >= 32,
        message: "JWT_SECRET must be at least 32 characters in production",
      },
      {
        check: this.config.POSTGRES_SSL === true,
        message: "SSL must be enabled for production database connections",
      },
    ];

    const failures = securityChecks.filter((check) => !check.check);

    if (failures.length > 0) {
      console.error("🚨 Production security validation failed:");
      failures.forEach((failure) => console.error(`   - ${failure.message}`));
      process.exit(1);
    }
  }

  public get(): EnvironmentConfig {
    return this.config;
  }

  public getEnvironment(): Environment {
    return this.environment;
  }

  public isDevelopment(): boolean {
    return this.environment === "development";
  }

  public isProduction(): boolean {
    return this.environment === "production";
  }

  public isTest(): boolean {
    return this.environment === "test";
  }

  // Utility method for encoding secrets (for documentation purposes)
  public static encodeSecret(secret: string): string {
    return Buffer.from(secret, "utf-8").toString("base64");
  }
}

export function loadGatewayConfig(env: Environment): MasterConfig {
  const root = new EnvironmentManager()["findProjectRoot"](process.cwd());
  const configFile =
    env === "development" ? "master.config.dev.json" : "master.config.json";
  const configPath = join(root, "apps", "gateway", configFile);

  if (!existsSync(configPath)) {
    throw new Error(`Gateway config not found at: ${configPath}`);
  }

  return JSON.parse(readFileSync(configPath, "utf-8"));
}

// Singleton instance
export const env = new EnvironmentManager();
export const envConfig = env.get();
