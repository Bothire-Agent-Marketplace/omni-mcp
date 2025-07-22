/**
 * Organization context types for request handling across services
 * These extend the base Prisma Organization type with context-specific fields
 */
import type { Organization } from "@mcp/database";

/**
 * Base organization context for request handling
 * Used in gateway, server-core, and other services for auth/request context
 */
export interface OrganizationContext {
  /** Organization ID from the database */
  organizationId: string;
  /** Organization Clerk ID */
  organizationClerkId?: string;
  /** Organization name (optional, loaded as needed) */
  name?: string;
  /** Organization slug (optional, loaded as needed) */
  slug?: string;
  /** User ID if context includes user info */
  userId?: string;
  /** User Clerk ID if context includes user info */
  userClerkId?: string;
  /** User's role in the organization */
  role?: string;
}

/**
 * Extended organization data with relationships
 * Used when you need the full organization plus related services
 */
export interface OrganizationWithServices extends Organization {
  /** Enabled services for this organization */
  enabledServices: EnabledService[];
  /** Optional metadata */
  memberCount?: number;
  activeSessionCount?: number;
}

/**
 * Enabled service configuration
 */
export interface EnabledService {
  id: string;
  name: string;
  description?: string;
  serverKey: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

/**
 * Minimal organization info for UI components
 * Matches what most React components actually need
 */
export interface OrganizationInfo {
  id: string;
  clerkId: string;
  name: string;
  slug?: string;
}

/**
 * Type guards
 */
export function isOrganizationContext(
  obj: unknown
): obj is OrganizationContext {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "organizationId" in obj &&
    typeof (obj as OrganizationContext).organizationId === "string"
  );
}

/**
 * Helper to create organization context from Prisma Organization
 */
export function createOrganizationContext(
  org: Organization,
  extras: Partial<OrganizationContext> = {}
): OrganizationContext {
  return {
    organizationId: org.id,
    organizationClerkId: org.clerkId,
    name: org.name,
    slug: org.slug,
    ...extras,
  };
}
