import { z, ZodIssue } from "zod";
import type { Environment } from "@mcp/schemas";

// Zod schema for port validation
const PortSchema = z.coerce
  .number()
  .int()
  .min(1024, "Port must be at least 1024")
  .max(65535, "Port must be at most 65535");

// Enterprise-grade validation methods following security best practices
export function validatePort(
  port: string | undefined,
  fallback: number
): number {
  if (port === undefined) return fallback;
  const result = PortSchema.safeParse(port);
  if (!result.success) {
    throw new Error(
      `Invalid port number: ${port}. ${result.error.errors[0].message}`
    );
  }
  return result.data;
}

// Zod schema for timeout validation
const TimeoutSchema = z.coerce
  .number()
  .int()
  .min(1000, "Timeout must be at least 1000ms")
  .max(300000, "Timeout must be at most 300000ms");

export function validateTimeout(
  timeout: string | undefined,
  fallback: number
): number {
  if (timeout === undefined) return fallback;
  const result = TimeoutSchema.safeParse(timeout);
  if (!result.success) {
    throw new Error(
      `Invalid timeout: ${timeout}. ${result.error.errors[0].message}`
    );
  }
  return result.data;
}

const SecretSchema = (environment: Environment, type: string) =>
  z.string().superRefine((secret: string, ctx: z.RefinementCtx) => {
    if (environment === "production") {
      if (
        secret.includes("dev-") ||
        secret.includes("change-in-production") ||
        secret === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Production secret for ${type} must be set and not contain development placeholders`,
        });
      }
      if (secret.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Production secret for ${type} must be at least 32 characters long`,
        });
      }
    }
  });

export function validateSecret(
  secret: string | undefined,
  environment: Environment,
  type: string
): string {
  const s = secret || "";
  const result = SecretSchema(environment, type).safeParse(s);
  if (!result.success) {
    throw new Error(
      result.error.errors.map((e: ZodIssue) => e.message).join(", ")
    );
  }
  return s;
}

const DecodedSecretSchema = z
  .string()
  .transform((s: string, ctx: z.RefinementCtx) => {
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
    } catch {
      // Maintain function signature, but add issue to context
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid base64 secret",
      });
      return z.NEVER;
    }

    return s;
  });

export function decodeSecret(secret: string | undefined): string {
  const s = secret || "";
  const result = DecodedSecretSchema.safeParse(s);
  return result.success ? result.data : s;
}

export function parseOrigins(originsString: string | undefined): string[] {
  if (!originsString) return [];
  return originsString
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
