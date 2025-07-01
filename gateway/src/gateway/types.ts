import { WebSocket } from "ws";

export interface ServerConfig {
  type: "mcp";
  url: string; // URL of the standalone MCP server
  capabilities: string[];
  description: string;
  healthCheckInterval: number;
}

export interface GatewayConfig {
  port: number;
  allowedOrigins: string[];
  jwtSecret: string;
  sessionTimeout: number;
  maxConcurrentSessions: number;
}

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
  connection?: WebSocket;
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface HealthStatus {
  [serverId: string]: {
    instances: number;
    healthy: number;
    capabilities: string[];
    lastCheck: string;
  };
}
