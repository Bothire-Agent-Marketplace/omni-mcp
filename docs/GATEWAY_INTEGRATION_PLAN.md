# Gateway Integration Implementation Plan

## Overview

This document outlines the specific steps needed to integrate the MCP Gateway with our multi-tenant
database system for organization-based access control.

## Current State Analysis

### ✅ What the Gateway Currently Has

- **API Key Authentication**: Simple API key validation for production
- **Basic Session Management**: Internal JWT tokens for session tracking
- **Rate Limiting**: Request throttling and abuse prevention
- **Health Checks**: Server health monitoring and routing
- **Capability Routing**: Routes requests to appropriate MCP servers
- **WebSocket Support**: Real-time bidirectional communication

### ❌ What's Missing for Multi-Tenancy

- **Clerk JWT Validation**: No integration with Clerk authentication
- **Organization Context**: No organization-based access control
- **Database Integration**: No querying of service enablement data
- **User Context**: No user identification or role checking

## Implementation Strategy

### Phase 1: Database Connection (Immediate)

#### 1.1 Add Database Dependencies

```bash
cd apps/gateway
pnpm add @prisma/client
pnpm add -D prisma
```

#### 1.2 Create Database Service

```typescript
// apps/gateway/src/services/database-service.ts
import { PrismaClient } from "@prisma/client";

export class GatewayDatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async getOrganizationServices(organizationId: string): Promise<string[]> {
    const services = await this.prisma.organizationService.findMany({
      where: {
        organizationId,
        enabled: true,
      },
      include: {
        mcpServer: {
          select: {
            serverKey: true,
            isActive: true,
          },
        },
      },
    });

    return services.filter((s) => s.mcpServer.isActive).map((s) => s.mcpServer.serverKey);
  }

  async getOrganizationByClerkId(clerkId: string) {
    return await this.prisma.organization.findUnique({
      where: { clerkId },
      select: { id: true, name: true, slug: true },
    });
  }
}
```

### Phase 2: Clerk JWT Validation (Week 1)

#### 2.1 Add Clerk Dependencies

```bash
cd apps/gateway
pnpm add @clerk/backend
```

#### 2.2 Create Clerk Service

```typescript
// apps/gateway/src/services/clerk-service.ts
import { clerkClient } from "@clerk/backend";

export class ClerkService {
  async verifyToken(token: string): Promise<{
    userId: string;
    organizationId: string | null;
    organizationRole: string | null;
  } | null> {
    try {
      const sessionToken = await clerkClient.verifyToken(token);

      return {
        userId: sessionToken.sub,
        organizationId: sessionToken.org_id || null,
        organizationRole: sessionToken.org_role || null,
      };
    } catch (error) {
      return null;
    }
  }

  async getUserOrganizations(userId: string) {
    try {
      const user = await clerkClient.users.getUser(userId);
      return (
        user.organizationMemberships?.map((membership) => ({
          organizationId: membership.organization.id,
          role: membership.role,
        })) || []
      );
    } catch (error) {
      return [];
    }
  }
}
```

### Phase 3: Authentication Middleware Update (Week 1)

#### 3.1 Enhanced Authentication

```typescript
// apps/gateway/src/middleware/auth-middleware.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { ClerkService } from "../services/clerk-service.js";
import { GatewayDatabaseService } from "../services/database-service.js";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    organizationId: string | null;
    organizationRole: string | null;
    enabledServices: string[];
  };
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  clerkService: ClerkService,
  dbService: GatewayDatabaseService
) {
  // Skip for health check and public endpoints
  if (request.url === "/health") {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "JWT token required in Authorization header",
    });
  }

  const token = authHeader.slice(7);

  // Verify Clerk JWT
  const clerkUser = await clerkService.verifyToken(token);
  if (!clerkUser) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid JWT token",
    });
  }

  // Require organization context for MCP requests
  if (request.url.startsWith("/mcp") && !clerkUser.organizationId) {
    return reply.code(403).send({
      error: "Forbidden",
      message: "Organization context required for MCP requests",
    });
  }

  // Get enabled services for organization
  let enabledServices: string[] = [];
  if (clerkUser.organizationId) {
    enabledServices = await dbService.getOrganizationServices(clerkUser.organizationId);
  }

  // Attach user context to request
  request.user = {
    id: clerkUser.userId,
    organizationId: clerkUser.organizationId,
    organizationRole: clerkUser.organizationRole,
    enabledServices,
  };
}
```

### Phase 4: Gateway Routing Updates (Week 1)

#### 4.1 Update MCPGateway Class

```typescript
// apps/gateway/src/gateway/mcp-gateway.ts (additions)

private async routeAndExecuteRequest(
  request: MCPRequest,
  session: Session,
  enabledServices: string[] = [] // NEW PARAMETER
): Promise<MCPResponse> {
  // ... existing code ...

  // Resolve capability to server
  const serverId = this.protocolAdapter.resolveCapability(
    request,
    this.capabilityMap
  );

  // NEW: Check organization access
  if (enabledServices.length > 0 && !enabledServices.includes(serverId)) {
    this.logger.warn(`Access denied for service: ${serverId}`, {
      requestId,
      enabledServices,
      requestedService: serverId,
    });

    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32000,
        message: "Access Denied",
        data: `Service '${serverId}' is not enabled for your organization`
      }
    };
  }

  // ... rest of existing code ...
}

// Update handleHttpRequest to pass enabled services
async handleHttpRequest(
  requestBody: unknown,
  headers: HTTPHeaders,
  enabledServices: string[] = [] // NEW PARAMETER
): Promise<GatewayHTTPResponse | MCPResponse> {
  // ... existing code ...

  const mcpResponse = await this.routeAndExecuteRequest(
    mcpRequest,
    session,
    enabledServices // Pass enabled services
  );

  // ... rest of existing code ...
}
```

### Phase 5: Update Fastify Server (Week 1)

#### 5.1 Integration with Main Server

```typescript
// apps/gateway/src/index.ts (updates)

import { ClerkService } from "./services/clerk-service.js";
import { GatewayDatabaseService } from "./services/database-service.js";
import { authMiddleware } from "./middleware/auth-middleware.js";

async function createServer(): Promise<FastifyInstance> {
  // ... existing code ...

  // Initialize services
  const clerkService = new ClerkService();
  const dbService = new GatewayDatabaseService();

  // ... existing middleware registration ...

  // Add authentication middleware
  server.addHook("preHandler", async (request, reply) => {
    await authMiddleware(request, reply, clerkService, dbService);
  });

  // Update MCP endpoint to use user context
  server.post<MCPRouteGeneric>(
    "/mcp",
    {
      schema: {
        body: MCPRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<MCPRouteGeneric>, reply: FastifyReply) => {
      try {
        const enabledServices = (request as any).user?.enabledServices || [];

        const response = await mcpGateway.handleHttpRequest(
          request.body,
          convertHeaders(request.headers),
          enabledServices
        );

        return reply.send(response);
      } catch (error) {
        logger.error("HTTP request error", error as Error);
        return reply.status(500).send({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ... rest of existing code ...
}
```

### Phase 6: Environment Configuration (Week 1)

#### 6.1 Update Gateway Configuration

```typescript
// apps/gateway/src/config.ts (additions)

async function createGatewayConfig(): Promise<GatewayConfig> {
  // ... existing code ...

  // Add database and Clerk configuration
  const config: GatewayConfig = {
    // ... existing config ...

    // Database configuration
    databaseUrl: process.env.DATABASE_URL,

    // Clerk configuration
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,

    // ... rest of existing config ...
  };

  // Validate required environment variables
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (!config.clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY environment variable is required");
  }

  return config;
}
```

#### 6.2 Environment Variables

```env
# Add to apps/gateway/.env
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_admin"
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

### Phase 7: Testing Strategy (Week 2)

#### 7.1 Unit Tests

```typescript
// apps/gateway/src/__tests__/auth-middleware.test.ts
import { describe, it, expect, vi } from "vitest";
import { authMiddleware } from "../middleware/auth-middleware.js";

describe("authMiddleware", () => {
  it("should allow access to health endpoint without auth", async () => {
    // Test implementation
  });

  it("should reject requests without JWT token", async () => {
    // Test implementation
  });

  it("should validate Clerk JWT and set user context", async () => {
    // Test implementation
  });

  it("should enforce organization-based access control", async () => {
    // Test implementation
  });
});
```

#### 7.2 Integration Tests

```typescript
// apps/gateway/src/__tests__/integration/organization-access.test.ts
import { describe, it, expect } from "vitest";
import { createTestServer } from "../helpers/test-server.js";

describe("Organization Access Control", () => {
  it("should deny access to disabled services", async () => {
    const server = await createTestServer();

    const response = await server.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: "Bearer valid-jwt-token",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "disabled_service_tool" },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().error.code).toBe(-32000);
    expect(response.json().error.message).toBe("Access Denied");
  });

  it("should allow access to enabled services", async () => {
    // Test implementation
  });
});
```

## Implementation Timeline

### Week 1: Core Integration

- [ ] Add database and Clerk dependencies
- [ ] Create database and Clerk service classes
- [ ] Implement authentication middleware
- [ ] Update gateway routing logic
- [ ] Update Fastify server integration
- [ ] Add environment configuration

### Week 2: Testing & Refinement

- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Test with real Clerk tokens
- [ ] Performance testing with database queries
- [ ] Error handling and edge cases

### Week 3: Production Readiness

- [ ] Connection pooling optimization
- [ ] Caching for frequently accessed data
- [ ] Monitoring and logging improvements
- [ ] Security audit and validation
- [ ] Documentation and deployment guide

## Security Considerations

### Authentication Security

- **JWT Validation**: Verify signatures and expiration
- **Token Storage**: Secure token handling in memory
- **Rate Limiting**: Prevent token brute force attacks
- **Organization Context**: Enforce organization isolation

### Database Security

- **Connection Pooling**: Prevent connection exhaustion
- **Query Optimization**: Indexed queries for performance
- **SQL Injection**: Parameterized queries via Prisma
- **Data Isolation**: Organization-scoped queries only

### API Security

- **Input Validation**: Validate all request parameters
- **Output Sanitization**: Prevent information leakage
- **Error Handling**: Generic error messages
- **Audit Logging**: Track all access attempts

## Performance Considerations

### Database Optimization

- **Connection Pooling**: Reuse database connections
- **Query Caching**: Cache frequently accessed data
- **Indexed Queries**: Optimize service lookup queries
- **Prepared Statements**: Reuse compiled queries

### Memory Management

- **JWT Caching**: Cache valid tokens temporarily
- **Service Lists**: Cache enabled services per organization
- **Connection Limits**: Monitor and limit concurrent connections
- **Garbage Collection**: Efficient memory cleanup

## Monitoring & Observability

### Metrics to Track

- **Authentication Success/Failure Rates**
- **Service Access Patterns**
- **Database Query Performance**
- **JWT Token Validation Times**
- **Organization Service Usage**

### Logging Strategy

- **Structured Logging**: JSON format with consistent fields
- **Access Logs**: All authentication attempts
- **Error Logs**: Detailed error information
- **Performance Logs**: Request/response timing
- **Security Logs**: Suspicious activity detection

## Success Criteria

### Functionality

- [ ] JWT tokens are properly validated
- [ ] Organization context is correctly extracted
- [ ] Service access is enforced per organization
- [ ] Database queries are performant
- [ ] Error handling is robust

### Performance

- [ ] Authentication adds < 50ms latency
- [ ] Database queries complete < 100ms
- [ ] Memory usage remains stable
- [ ] No connection leaks

### Security

- [ ] Invalid tokens are rejected
- [ ] Organization isolation is enforced
- [ ] SQL injection is prevented
- [ ] Audit logs are complete

This implementation will provide a robust, secure, and performant multi-tenant gateway system that
integrates seamlessly with our database-driven service enablement architecture.
