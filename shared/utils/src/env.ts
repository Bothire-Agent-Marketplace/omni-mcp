import { config } from "dotenv";
import { join } from "path";
import { existsSync } from "fs";

export type Environment = "development" | "production" | "test";

export interface EnvironmentConfig {
  NODE_ENV: Environment;
  LOG_LEVEL: string;

  // Gateway
  GATEWAY_PORT: number;
  GATEWAY_HOST: string;

  // Database
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;

  // MCP Servers
  LINEAR_API_KEY: string;

  // Security
  JWT_SECRET: string;
  MCP_API_KEY: string;

  // MCP Configuration
  MCP_HANDSHAKE_TIMEOUT: number;

  // Optional timezone
  TZ?: string;
}

class EnvironmentManager {
  private config: EnvironmentConfig;
  private environment: Environment;

  constructor() {
    this.environment = this.detectEnvironment();
    this.loadEnvironmentFile();
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

  private loadEnvironmentFile(): void {
    // Determine service name from process arguments or default
    const serviceName = this.getServiceName();
    const envFile = serviceName
      ? `.env.${serviceName}.local`
      : `.env.${this.environment}.local`;

    // Try to find the environment file in current directory or parent directories
    let envPath = join(process.cwd(), envFile);

    // If not found in current directory, try parent directory (for monorepo structure)
    if (!existsSync(envPath)) {
      envPath = join(process.cwd(), "..", envFile);
    }

    // Fallback to general environment file if service-specific not found
    if (!existsSync(envPath) && serviceName) {
      const fallbackFile = `.env.${this.environment}.local`;
      envPath = join(process.cwd(), fallbackFile);
      if (!existsSync(envPath)) {
        envPath = join(process.cwd(), "..", fallbackFile);
      }
    }

    // Load environment file
    const result = config({ path: envPath });

    console.log(`🔧 Loaded environment: ${this.environment}`);
    console.log(`📁 Environment file: ${envFile}`);

    if (result.error) {
      console.warn(`⚠️  Could not load ${envFile}: ${result.error.message}`);
    } else {
      console.log(`✅ Successfully loaded environment from: ${envPath}`);
    }
  }

  private getServiceName(): string | null {
    // Detect service name from package.json or process
    try {
      const packageJsonPath = join(process.cwd(), "package.json");
      if (existsSync(packageJsonPath)) {
        const packageJson = require(packageJsonPath);
        const name = packageJson.name;

        // Extract service name from package name
        if (name === "@mcp/gateway") return "gateway";
        if (name === "@mcp/linear-server") return "linear";
        if (name.includes("gateway")) return "gateway";
        if (name.includes("linear")) return "linear";
      }
    } catch (error) {
      // Ignore errors in service detection
    }

    return null;
  }

  private buildConfig(): EnvironmentConfig {
    return {
      NODE_ENV: this.environment,
      LOG_LEVEL:
        process.env.LOG_LEVEL ||
        (this.environment === "production" ? "info" : "debug"),

      // Gateway
      GATEWAY_PORT: this.validatePort(process.env.GATEWAY_PORT || "37373"),
      GATEWAY_HOST: process.env.GATEWAY_HOST || "0.0.0.0",

      // Database
      POSTGRES_HOST: process.env.POSTGRES_HOST || "localhost",
      POSTGRES_PORT: this.validatePort(process.env.POSTGRES_PORT || "5432"),
      POSTGRES_DB: process.env.POSTGRES_DB || `omni_mcp_${this.environment}`,
      POSTGRES_USER: process.env.POSTGRES_USER || "postgres",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "postgres",

      // MCP Servers
      LINEAR_API_KEY: this.decodeSecret(process.env.LINEAR_API_KEY || ""),

      // Security
      JWT_SECRET: this.validateSecret(
        process.env.JWT_SECRET || "dev-jwt-secret-change-in-production"
      ),
      MCP_API_KEY: this.validateSecret(
        process.env.MCP_API_KEY || "dev-api-key-change-in-production"
      ),

      // MCP Configuration
      MCP_HANDSHAKE_TIMEOUT: this.validateTimeout(
        process.env.MCP_HANDSHAKE_TIMEOUT || "10000"
      ),

      // Optional
      TZ: process.env.TZ,
    };
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
        check: this.config.GATEWAY_HOST !== "0.0.0.0",
        message: "GATEWAY_HOST should not be 0.0.0.0 in production",
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

// Singleton instance
export const env = new EnvironmentManager();
export const envConfig = env.get();
