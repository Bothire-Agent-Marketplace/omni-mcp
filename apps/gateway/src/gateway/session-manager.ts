import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Session, GatewayConfig, IWebSocket } from "@mcp/schemas";
import { createMcpLogger } from "@mcp/utils";

export class MCPSessionManager {
  private logger = createMcpLogger("mcp-gateway-session-manager");
  private sessions = new Map<string, Session>();
  private config: GatewayConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: GatewayConfig) {
    this.config = config;

    // Start session cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Clean up every minute
  }

  shutdown(): void {
    clearInterval(this.cleanupInterval);

    // Close all WebSocket connections
    for (const session of this.sessions.values()) {
      if (session.connection) {
        session.connection.close();
      }
    }

    this.sessions.clear();
  }

  createSession(
    userId: string = "anonymous",
    transport: "http" | "websocket" = "http"
  ): Session {
    const sessionId = uuidv4();
    const now = new Date();

    const session: Session = {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      serverConnections: new Map(),
      transport,
    };

    this.sessions.set(sessionId, session);
    this.logger.debug(`Created new session: ${sessionId} for user: ${userId}`);

    return session;
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  attachWebSocket(sessionId: string, ws: IWebSocket): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connection = ws;
      session.transport = "websocket";
      return true;
    }
    return false;
  }

  generateToken(sessionId: string): string {
    return jwt.sign(
      { sessionId, timestamp: Date.now() },
      this.config.jwtSecret,
      { expiresIn: "1h" }
    );
  }

  validateToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      return decoded.sessionId;
    } catch (error) {
      this.logger.warn("Invalid token", { error: String(error) });
      return null;
    }
  }

  getSessionFromAuthHeader(authHeader: string): Session | null {
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const sessionId = this.validateToken(token);

    if (sessionId) {
      return this.getSession(sessionId);
    }

    return null;
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clean up server connections
      session.serverConnections.clear();

      // Close WebSocket if exists
      if (session.connection) {
        session.connection.close();
      }

      this.sessions.delete(sessionId);
      this.logger.debug(`Removed session: ${sessionId}`);
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  canCreateNewSession(): boolean {
    return this.sessions.size < this.config.maxConcurrentSessions;
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity =
        now.getTime() - session.lastActivity.getTime();

      if (timeSinceLastActivity > this.config.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.removeSession(sessionId);
      this.logger.debug(`Cleaned up expired session: ${sessionId}`);
    }

    if (expiredSessions.length > 0) {
      this.logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
}
