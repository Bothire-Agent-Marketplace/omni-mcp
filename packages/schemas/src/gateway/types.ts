import type { MCPJsonRpcResponse } from "../mcp/protocol.js";

export interface ServerInstance {
  id: string;
  serverId: string;
  url: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  activeConnections: number;
  capabilities: string[];
}

// ============================================================================
// SESSION MANAGEMENT TYPES (UNIFIED)
// ============================================================================

/**
 * Core session data - shared between runtime and database
 */
export interface BaseSession {
  id: string;
  userId: string;
  organizationId?: string;
  organizationClerkId?: string;
  createdAt: Date;
  lastActivity?: Date;
}

/**
 * Runtime session for active connections (gateway)
 * Extends base session with connection-specific data
 */
export interface Session extends BaseSession {
  lastActivity: Date; // Required for runtime sessions
  serverConnections: Map<string, ServerInstance>;
  transport: "http" | "websocket";
  connection?: IWebSocket;
}

/**
 * Database session structure (matches Prisma model)
 * For session persistence and cross-request continuity
 */
export interface DatabaseSession extends BaseSession {
  sessionToken: string;
  metadata: Record<string, unknown>;
  expiresAt: Date;
  updatedAt: Date;
}

/**
 * JWT session payload for token-based authentication
 */
export interface SessionJwtPayload {
  sessionId: string;
  userId: string;
  organizationId?: string;
  organizationClerkId?: string;
  timestamp: number;
  expiresAt: number;
}

export interface IWebSocket {
  send(data: string): void;
  on(
    event: "message",
    listener: (data: string | ArrayBuffer | Uint8Array) => void
  ): this;
  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  close(): void;
}

export interface HealthStatus {
  [serverId: string]: {
    instances: number;
    healthy: number;
    capabilities: string[];
    lastCheck: string;
  };
}

// HTTP Types - consolidated from various components
export interface HTTPHeaders {
  authorization?: string;
  Authorization?: string;
  "content-type"?: string;
  "user-agent"?: string;
  [key: string]: string | undefined;
}

export interface HTTPRequestBody {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface HTTPResponse {
  success: boolean;
  error?: string;
  code?: number;
  data?: unknown;
  id?: string | number;
}

export interface GatewayHTTPResponse extends HTTPResponse {
  sessionToken?: string;
}

// Deprecated schemas removed - use unified schemas from @mcp/schemas

// Fastify Route Generic Interfaces
export interface MCPRouteGeneric {
  Body: HTTPRequestBody;
  Headers: HTTPHeaders;
  Reply: GatewayHTTPResponse | MCPJsonRpcResponse;
}

export interface HealthRouteGeneric {
  Reply: {
    status: string;
    timestamp: string;
    servers: HealthStatus;
  };
}

export interface WebSocketRouteGeneric {
  Querystring: {
    token?: string;
  };
}
