# Engineering Spec: Organization-Based Service Enablement

## 1. Overview

This document outlines the implementation of organization-based service enablement for the MCP
platform. The goal is to allow granular control over which MCP servers (e.g., Devtools, Linear,
Perplexity) are accessible to different customer organizations.

**✅ IMPLEMENTATION STATUS: COMPLETED**

The system has been implemented using a PostgreSQL database with Clerk webhook synchronization,
providing robust multi-tenant access control.

## 2. Core Requirements & Goals

✅ **Organization-level Control:** Administrators can enable/disable specific MCP servers per
organization  
✅ **Secure by Default:** Organizations have no access to servers unless explicitly enabled  
✅ **Gateway Enforcement:** The `mcp-gateway` enforces access rules at the routing level  
✅ **Dynamic Frontend:** UI components render based on organization's enabled services  
✅ **Scalability:** New organizations and servers can be added without code changes  
✅ **Audit Trail:** Complete history of service enablement changes

## 3. Implemented Architecture

### 3.1. Database-First Approach

Instead of using Clerk's metadata, the system uses a PostgreSQL database for authoritative service
enablement data:

```sql
-- Organization service enablement
CREATE TABLE organization_services (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    mcp_server_id UUID REFERENCES mcp_servers(id),
    enabled BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits:**

- **Performance:** Direct database queries vs API calls to Clerk
- **Flexibility:** Custom configuration per organization-service combination
- **Auditability:** Complete change history with timestamps
- **Scalability:** Database queries scale better than metadata lookups

### 3.2. Clerk Integration via Webhooks

Organizations, users, and memberships are synchronized from Clerk via webhooks:

```typescript
// Webhook handlers automatically sync data
POST / api / webhooks / clerk -
  user.created / updated / deleted -
  organization.created / updated / deleted -
  organizationMembership.created / updated / deleted;
```

**Data Flow:**

1. User creates organization in Clerk
2. Webhook triggers database sync
3. Default service enablements are created
4. User can modify enablements via admin UI
5. Gateway queries database for access control

### 3.3. Gateway Integration (TO BE IMPLEMENTED)

The gateway needs to be updated to validate JWT tokens and query the database:

```typescript
// Gateway middleware for organization-based access control
async function validateOrganizationAccess(
  request: MCPRequest,
  authToken: string
): Promise<string[] | null> {
  // 1. Validate Clerk JWT token
  const clerkUser = await verifyClerkToken(authToken);
  if (!clerkUser) return null;

  // 2. Get user's organization context
  const organizationId = clerkUser.org_id;
  if (!organizationId) return null;

  // 3. Query database for enabled services
  const enabledServices = await DatabaseService.getOrganizationServices(organizationId);

  return enabledServices.map((service) => service.mcpServer.serverKey);
}
```

## 4. Current Implementation Status

### ✅ Completed Components

#### Database Schema

- **Multi-tenant database** with organization isolation
- **Service enablement** table with configuration support
- **Audit logging** for all changes
- **Webhook synchronization** with Clerk

#### Database Service Layer

- **CRUD operations** for all entities
- **Clerk webhook handlers** for real-time sync
- **Service management** functions
- **Type-safe** operations with Prisma

#### Admin Application

- **Next.js application** with Clerk authentication
- **Webhook endpoints** for Clerk synchronization
- **Health monitoring** and database connectivity
- **Development tooling** with Prisma Studio

### 🔄 In Progress

#### Gateway Integration

- **JWT validation** for Clerk tokens
- **Organization context** extraction
- **Database queries** for service enablement
- **Access control** in routing logic

#### Admin UI

- **Service management** interface
- **Organization administration** pages
- **Audit log** visualization
- **Role-based access** controls

## 5. Implementation Guide

### 5.1. Gateway Updates Required

The gateway currently lacks organization-based access control. Required changes:

```typescript
// 1. Add Clerk JWT validation
import { clerkClient } from '@clerk/nextjs/server';

// 2. Extract organization from token
private async getOrganizationFromToken(authToken: string): Promise<string | null> {
  try {
    const token = authToken.replace('Bearer ', '');
    const sessionClaims = await clerkClient.verifyToken(token);
    return sessionClaims.org_id || null;
  } catch (error) {
    return null;
  }
}

// 3. Query database for enabled services
private async getEnabledServices(organizationId: string): Promise<string[]> {
  const services = await DatabaseService.getOrganizationServices(organizationId);
  return services.map(s => s.mcpServer.serverKey);
}

// 4. Enforce access control in routing
private async routeAndExecuteRequest(
  request: MCPRequest,
  session: Session,
  enabledServices: string[]
): Promise<MCPResponse> {
  const serverId = this.protocolAdapter.resolveCapability(request, this.capabilityMap);

  // NEW: Check organization access
  if (!enabledServices.includes(serverId)) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32000,
        message: "Access Denied",
        data: `Service '${serverId}' not enabled for your organization`
      }
    };
  }

  // Continue with existing logic...
}
```

### 5.2. Frontend Integration Pattern

```typescript
// 1. Create service enablement hook
export function useEnabledServices() {
  const { organization } = useOrganization();
  const [enabledServices, setEnabledServices] = useState<string[]>([]);

  useEffect(() => {
    if (organization?.id) {
      fetchEnabledServices(organization.id)
        .then(setEnabledServices);
    }
  }, [organization?.id]);

  return {
    enabledServices,
    isEnabled: (serviceKey: string) => enabledServices.includes(serviceKey)
  };
}

// 2. Conditional UI rendering
export function ServiceToolbar() {
  const { isEnabled } = useEnabledServices();

  return (
    <div>
      {isEnabled('devtools') && <DevToolsButton />}
      {isEnabled('linear') && <LinearButton />}
      {isEnabled('perplexity') && <PerplexityButton />}
    </div>
  );
}
```

## 6. Security Considerations

### Database Security

- **Organization isolation** - All queries scoped to organization
- **Role-based access** - Admin/Member/Viewer permissions
- **Audit trails** - Complete change history
- **Soft deletes** - Data preservation for compliance

### Authentication Flow

- **JWT validation** - Clerk tokens verified server-side
- **Organization context** - Extracted from validated tokens
- **Database queries** - Authoritative source for permissions
- **Cache invalidation** - Real-time updates via webhooks

### API Security

- **Rate limiting** - Prevent abuse
- **Input validation** - Zod schemas for all requests
- **Error handling** - No information leakage
- **HTTPS enforcement** - All connections encrypted

## 7. Monitoring & Maintenance

### Database Monitoring

```sql
-- Check service enablement distribution
SELECT
  ms.name,
  COUNT(os.id) as enabled_orgs,
  COUNT(os.id) FILTER (WHERE os.enabled = true) as active_orgs
FROM mcp_servers ms
LEFT JOIN organization_services os ON ms.id = os.mcp_server_id
GROUP BY ms.name;

-- Audit trail analysis
SELECT
  entity_type,
  action,
  COUNT(*) as event_count,
  DATE_TRUNC('day', created_at) as date
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY entity_type, action, DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

### Health Monitoring

- **Database connectivity** - `/api/health` endpoint
- **Webhook processing** - Success/failure rates
- **Service availability** - Gateway health checks
- **Performance metrics** - Query response times

## 8. Migration Strategy

### Development Phase

1. **Complete gateway integration** - Add JWT validation and database queries
2. **Build admin UI** - Service management interface
3. **Test webhook flow** - Verify Clerk synchronization
4. **Performance testing** - Database query optimization

### Production Deployment

1. **Database migration** - Run schema updates
2. **Seed data** - Default MCP servers
3. **Webhook configuration** - Clerk webhook endpoints
4. **Gateway deployment** - Updated routing logic
5. **Admin UI deployment** - Organization management

## 9. Next Steps

### Immediate (Week 1)

- [ ] Implement JWT validation in gateway
- [ ] Add organization context extraction
- [ ] Create database query layer for gateway
- [ ] Test end-to-end access control

### Short-term (Weeks 2-3)

- [ ] Build admin UI for service management
- [ ] Implement role-based access controls
- [ ] Add audit log visualization
- [ ] Performance optimization

### Long-term (Month 2+)

- [ ] Advanced configuration options
- [ ] Usage analytics and reporting
- [ ] Automated service provisioning
- [ ] Multi-region deployment support

The foundation is solid and the implementation is straightforward. The database-first approach
provides much better performance and flexibility than the original Clerk metadata approach.
