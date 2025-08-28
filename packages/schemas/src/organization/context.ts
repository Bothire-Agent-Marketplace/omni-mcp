import type { Organization } from "@mcp/database/client";

export interface OrganizationContext {
  organizationId: string;

  organizationClerkId?: string;

  name?: string;

  slug?: string;

  userId?: string;

  userClerkId?: string;

  role?: string;
}

export interface OrganizationWithServices extends Organization {
  enabledServices: EnabledService[];

  memberCount?: number;
  activeSessionCount?: number;
}

export interface EnabledService {
  id: string;
  name: string;
  description?: string;
  serverKey: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

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
