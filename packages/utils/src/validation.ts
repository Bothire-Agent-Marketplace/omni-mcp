export type Environment = "development" | "production" | "test";

// Enterprise-grade validation methods following security best practices
export function validatePort(
  port: string | undefined,
  fallback: number
): number {
  if (port === undefined) return fallback;
  const parsedPort = parseInt(port, 10);
  if (isNaN(parsedPort) || parsedPort < 1024 || parsedPort > 65535) {
    throw new Error(`Invalid port number: ${port}. Must be between 1024-65535`);
  }
  return parsedPort;
}

export function validateTimeout(
  timeout: string | undefined,
  fallback: number
): number {
  if (timeout === undefined) return fallback;
  const parsedTimeout = parseInt(timeout, 10);
  if (isNaN(parsedTimeout) || parsedTimeout < 1000 || parsedTimeout > 300000) {
    throw new Error(
      `Invalid timeout: ${timeout}. Must be between 1000-300000ms`
    );
  }
  return parsedTimeout;
}

export function validateSecret(
  secret: string | undefined,
  environment: Environment,
  type: string
): string {
  const s = secret || "";
  if (environment === "production") {
    if (s.includes("dev-") || s.includes("change-in-production") || s === "") {
      throw new Error(
        `Production secret for ${type} must be set and not contain development placeholders`
      );
    }
    if (s.length < 32) {
      throw new Error(
        `Production secret for ${type} must be at least 32 characters long`
      );
    }
  }
  return s;
}

export function decodeSecret(secret: string | undefined): string {
  const s = secret || "";
  if (!s) return "";

  // Check if secret is base64 encoded (for security best practices)
  try {
    if (s.match(/^[A-Za-z0-9+/]+=*$/)) {
      const decoded = Buffer.from(s, "base64").toString("utf-8");
      // Simple validation for Linear API keys, can be expanded
      if (decoded.startsWith("lin_api_")) {
        return decoded;
      }
    }
  } catch (_error) {
    // Validation failed - return empty string to maintain function signature
    return "";
  }

  return s;
}

export function parseOrigins(originsString: string | undefined): string[] {
  if (!originsString) return [];
  return originsString
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
