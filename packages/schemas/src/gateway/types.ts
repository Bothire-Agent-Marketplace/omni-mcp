export interface ServerConfig {
  type: "mcp";
  url: string; // URL of the standalone MCP server
  capabilities: string[];
  description: string;
  healthCheckInterval: number;
  requiresAuth: boolean;
  maxRetries: number;
}

export interface MCPServersRuntimeConfig {
  [key: string]: ServerConfig;
}

export interface GatewayConfig {
  env: "development" | "production" | "test";
  port: number;
  host: string;
  allowedOrigins: string[];
  jwtSecret: string;
  mcpApiKey: string;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  rateLimitPerMinute: number;
  requireApiKey: boolean;
  enableRateLimit: boolean;
  maxRequestSizeMb: number;
  corsCredentials: boolean;
  securityHeaders: boolean;
  mcpServers: MCPServersRuntimeConfig;
}

// DEPRECATED: This is now merged into GatewayConfig
export interface MasterConfig {
  servers: Record<string, ServerConfig>;
  gateway: GatewayConfig;
}

export interface ServerInstance {
  id: string;
  serverId: string;
  url: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  activeConnections: number;
  capabilities: string[];
}

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  serverConnections: Map<string, ServerInstance>;
  transport: "http" | "websocket";
  connection?: IWebSocket;
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: "2.0";
  id?: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPErrorResponse {
  jsonrpc: "2.0";
  id?: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface IWebSocket {
  send(data: string): void;
  on(event: "message", listener: (data: Buffer) => void): this;
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

// Fastify JSON Schemas for validation
export const MCPRequestSchema = {
  type: "object",
  properties: {
    jsonrpc: { type: "string", const: "2.0" },
    id: { type: ["string", "number"] },
    method: { type: "string" },
    params: { type: "object" },
  },
  required: ["jsonrpc", "method"],
  additionalProperties: false,
} as const;

export const HealthCheckResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    timestamp: { type: "string" },
    servers: { type: "object" },
  },
  required: ["status", "timestamp", "servers"],
  additionalProperties: false,
} as const;

export const ErrorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    details: { type: "object" },
  },
  required: ["error", "message"],
  additionalProperties: false,
} as const;

// Fastify Route Generic Interfaces
export interface MCPRouteGeneric {
  Body: HTTPRequestBody;
  Headers: HTTPHeaders;
  Reply: GatewayHTTPResponse | MCPResponse;
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
