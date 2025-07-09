# Engineering Spec: Organization-Based Service Enablement

## 1. Overview

This document outlines the engineering plan for implementing organization-based service enablement.
The goal is to allow specific "MCP Servers" (e.g., Devtools, Linear, Perplexity) to be enabled or
disabled for different customer organizations.

This feature will be built upon our existing gateway architecture, Next.js frontend, and will use
Clerk for authentication and authorization.

## 2. Core Requirements & Goals

- **Organization-level Control:** System administrators (and in the future, organization admins)
  must be able to enable or disable access to specific MCP servers for each organization.
- **Secure by Default:** If no configuration is present for an organization, it should have access
  to no servers (or a predefined, safe default set).
- **Gateway Enforcement:** The `mcp-gateway` must enforce these access rules, rejecting requests to
  disabled services with a clear error.
- **Dynamic Frontend:** The Next.js frontend must dynamically display UI elements (e.g., tools,
  options) only for the services that are enabled for the user's current organization.
- **Scalability:** The solution must scale to accommodate new organizations and new MCP servers
  without requiring code changes for each addition.

## 3. Proposed Architecture

We will leverage Clerk's metadata capabilities as the source of truth for which services an
organization can access. This avoids introducing a new database and keeps authorization data tightly
coupled with the authentication provider.

### 3.1. Data Model: Clerk Organization Metadata

We will use the `privateMetadata` field on Clerk's `Organization` object to store the configuration.
This metadata is accessible from the backend using a secret key but hidden from clients, which is
ideal for this use case.

- **Key:** `enabled_services`
- **Value:** An array of strings, where each string is the unique name of an enabled MCP server
  (e.g., `"devtools"`, `"linear"`).

**Example `privateMetadata`:**

```json
{
  "enabled_services": ["devtools", "perplexity"]
}
```

An organization with this metadata would have access to the Devtools and Perplexity servers, but not
Linear.

### 3.2. Backend / Gateway Modifications (`apps/gateway`)

The primary changes will be in the `MCPGateway` class to make it organization-aware.

**1. Authentication Middleware (New):**

- A new authentication middleware will be introduced in `apps/gateway/src/index.ts` (or a new
  `middleware` directory).
- This middleware will be placed before the main `/mcp` and `/messages` route handlers.
- **Function:**
  - It will use the Clerk SDK (`@clerk/nextjs/server`) to validate the JWT from the `Authorization`
    header.
  - It will extract the `orgId` and the `privateMetadata` from the validated session.
  - It will attach the `enabled_services` array (or an empty array if not present) to the request
    object (e.g., `request.auth.enabled_services`) for downstream use.
  - If the token is invalid or no `orgId` is present, it will reject the request with a
    `401 Unauthorized` or `403 Forbidden` error.

**2. Modify Routing Logic (`MCPGateway.routeAndExecuteRequest`):**

- The `handleHttpRequest` method in `MCPGateway` will be updated to accept the `enabled_services`
  array from the middleware.
- The `routeAndExecuteRequest` method will be modified to include a new check:

```typescript
// Inside routeAndExecuteRequest(request, session, enabledServices)

// ... after resolving serverId from capabilityMap
const serverId = this.protocolAdapter.resolveCapability(request, this.capabilityMap);

// NEW: Enforce organization access
if (!enabledServices.includes(serverId)) {
  this.logger.warn(`Organization denied access to server: ${serverId}`, {
    // ... logging context
  });
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32000, // Custom server error
      message: "Access Denied",
      data: `The '${serverId}' service is not enabled for your organization.`,
    },
  };
}

// ... continue to getServerInstance and execute request
```

**3. Modify Capability & Tool Listing:**

- The methods `getAvailableTools`, `getAvailableResources`, etc., must be filtered based on the
  organization's enabled services.
- The `handleHttpRequest` function will pass the `enabled_services` list to these methods.
- Each method will filter its results, only returning capabilities from the servers the organization
  has access to.

### 3.3. Frontend Modifications (Next.js App)

The frontend will use Clerk's hooks to dynamically render the UI.

**1. Reading Enabled Services:**

- We will use Clerk's `useOrganization` hook on the client-side.
- The `organization.privateMetadata` is not available on the client. We will need to expose this
  data via a secure API endpoint.
- **New API Route:** Create `pages/api/organization/settings.ts`. This endpoint will use Clerk's
  `getAuth` to securely get the user's `orgId` on the server-side, retrieve the organization's
  `privateMetadata`, and return the `enabled_services` list.

**2. Conditional UI Rendering:**

- A React Context provider (e.g., `EnabledServicesProvider`) will fetch the list from the new API
  route and make it available throughout the application.
- UI components will consume this context to conditionally render features.

```jsx
// Example Component
import { useEnabledServices } from "../path/to/EnabledServicesProvider";

function Toolbar() {
  const { isEnabled } = useEnabledServices();

  return (
    <div>
      {isEnabled("devtools") && <DevToolsButton />}
      {isEnabled("linear") && <LinearIntegrationButton />}
    </div>
  );
}
```

### 3.4. Admin Interface

A new section in the application's settings area will be created for organization administration.

- **UI:** A page that lists all available MCP Servers (from a static configuration or a new API
  endpoint) with a checkbox for each one.
- **Logic:**
  - This page will be protected by a role check (e.g., `org:admin`) using Clerk's middleware.
  - When an admin saves the changes, the frontend will make a `POST` request to a new secure API
    endpoint (e.g., `pages/api/organization/update-settings`).
  - This backend endpoint will use the Clerk Backend SDK to update the `privateMetadata` for the
    organization.

## 4. Implementation & Rollout Plan

1.  **Backend First:**
    - **Task 1:** Integrate Clerk Backend SDK into `apps/gateway`.
    - **Task 2:** Implement the new authentication middleware to extract and verify organization
      context.
    - **Task 3:** Update `MCPGateway` routing and capability-listing methods to enforce the
      `enabled_services` list.
2.  **Frontend Integration:**
    - **Task 4:** Create the secure API endpoint to expose `enabled_services` to the client.
    - **Task 5:** Implement the `EnabledServicesProvider` and update UI components to be dynamic.
3.  **Admin UI:**
    - **Task 6:** Build the admin page for managing service access.
    - **Task 7:** Implement the API endpoint to handle updates to organization metadata.

## 5. Security Considerations

- **Backend Enforcement is Key:** The frontend checks are for UX only. The gateway _must_ be the
  ultimate enforcer of the access rules.
- **Admin Roles:** Access to the administration UI must be strictly controlled using Clerk's
  role-based access control (`org:admin`).
- **Input Validation:** When updating metadata, the backend must validate that the provided service
  names are valid, known MCP servers to prevent injection of arbitrary data.
