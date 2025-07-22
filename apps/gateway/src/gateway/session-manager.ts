import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  Session,
  McpGatewayConfig,
  IWebSocket,
  SessionJwtPayload,
} from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";
import {
  OrganizationContextService,
  OrganizationContext,
} from "../services/organization-context.js";

export class MCPSessionManager {
  private logger: McpLogger;
  private sessions = new Map<string, Session>();
  private config: McpGatewayConfig;
  private cleanupInterval: NodeJS.Timeout;
  private orgContextService: OrganizationContextService;

  constructor(config: McpGatewayConfig, logger: McpLogger) {
    this.config = config;
    this.logger = logger;
    this.orgContextService = new OrganizationContextService(
      config.jwtSecret,
      logger
    );

    // Start session cleanup interval - more frequent in development
    const cleanupInterval = config.env === "production" ? 60000 : 30000;
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, cleanupInterval);

    this.logger.debug(`Session cleanup interval set to ${cleanupInterval}ms`);
  }

  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);

    for (const session of this.sessions.values()) {
      if (session.connection) {
        session.connection.close();
      }
    }

    this.sessions.clear();
  }

  createSession(
    userId: string = "anonymous",
    transport: "http" | "websocket" = "http",
    organizationContext?: OrganizationContext
  ): Session {
    const sessionId = uuidv4();
    const now = new Date();

    const session: Session = {
      id: sessionId,
      userId,
      organizationId: organizationContext?.organizationId,
      organizationClerkId: organizationContext?.organizationClerkId,
      createdAt: now,
      lastActivity: now,
      serverConnections: new Map(),
      transport,
    };

    this.sessions.set(sessionId, session);
    this.logger.debug(`Created new session: ${sessionId} for user: ${userId}`, {
      organizationId: organizationContext?.organizationId,
      organizationSlug: organizationContext?.slug,
    });

    return session;
  }

  /**
   * Find existing session for user and organization context
   */
  private findExistingSession(
    userId: string,
    organizationClerkId?: string,
    transport: "http" | "websocket" = "http"
  ): Session | null {
    for (const session of this.sessions.values()) {
      if (
        session.userId === userId &&
        session.organizationClerkId === organizationClerkId &&
        session.transport === transport
      ) {
        // Check if session is still valid (not expired)
        const now = new Date();
        const timeSinceLastActivity =
          now.getTime() - session.lastActivity.getTime();

        if (timeSinceLastActivity < this.config.sessionTimeout) {
          session.lastActivity = now;
          this.logger.debug(
            `Reusing existing session: ${session.id} for user: ${userId}`
          );
          return session;
        }
      }
    }
    return null;
  }

  /**
   * Create session with organization context extracted from auth headers
   * Now supports organization context simulation for testing and session reuse
   */
  async createSessionWithAuth(
    authHeader?: string,
    apiKey?: string,
    transport: "http" | "websocket" = "http",
    simulateOrgHeader?: string
  ): Promise<Session> {
    const orgContext = await this.orgContextService.extractOrganizationContext(
      authHeader,
      apiKey
    );

    const userId = orgContext?.userClerkId || "anonymous";

    // Determine final organization context (with simulation support)
    let finalOrgContext = orgContext;

    if (simulateOrgHeader && orgContext) {
      const hasPermission = await this.validateSimulationPermission(
        orgContext,
        simulateOrgHeader
      );

      if (hasPermission) {
        const simulatedContext = await this.createSimulatedContext(
          orgContext,
          simulateOrgHeader
        );

        if (simulatedContext) {
          finalOrgContext = simulatedContext;
          this.logger.info(`Using simulated organization context`, {
            actualOrgId: orgContext.organizationClerkId,
            simulatedOrgId: simulateOrgHeader,
            userId: orgContext.userClerkId,
          });
        }
      } else {
        this.logger.warn(
          `User attempted unauthorized organization simulation`,
          {
            userId: orgContext.userClerkId,
            actualOrgId: orgContext.organizationClerkId,
            attemptedOrgId: simulateOrgHeader,
          }
        );
      }
    }

    // Try to find existing session first
    const existingSession = this.findExistingSession(
      userId,
      finalOrgContext?.organizationClerkId,
      transport
    );

    if (existingSession) {
      return existingSession;
    }

    // Create new session if none exists
    return this.createSession(userId, transport, finalOrgContext || undefined);
  }

  /**
   * Validate if user has permission to simulate organization context
   * For now, allow simulation within same organization or if user is admin
   */
  private async validateSimulationPermission(
    userContext: OrganizationContext,
    simulateOrgClerkId: string
  ): Promise<boolean> {
    try {
      // Allow simulation of same organization (useful for testing different contexts)
      if (userContext.organizationClerkId === simulateOrgClerkId) {
        return true;
      }

      // TODO: Add more sophisticated permission checking
      // For now, we'll be restrictive and only allow same-org simulation
      // In future, could check if user is super admin or has testing permissions

      return false;
    } catch (error) {
      this.logger.error(
        "Error validating simulation permission",
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Create simulated organization context for testing
   */
  private async createSimulatedContext(
    baseContext: OrganizationContext,
    simulateOrgClerkId: string
  ): Promise<OrganizationContext | null> {
    try {
      // For same-organization simulation, return the base context
      // This allows testing different request contexts within same org
      if (baseContext.organizationClerkId === simulateOrgClerkId) {
        return {
          ...baseContext,
          // Mark as simulated for logging/debugging
          isSimulated: true,
        } as OrganizationContext & { isSimulated: boolean };
      }

      // TODO: For cross-organization simulation (if permitted),
      // we would need to look up the target organization details
      // This would require database access and proper permission validation

      return null;
    } catch (error) {
      this.logger.error(
        "Error creating simulated context",
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
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
      const decoded = jwt.verify(
        token,
        this.config.jwtSecret
      ) as SessionJwtPayload;
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

  /**
   * Get session statistics for monitoring
   */
  getSessionStats(): {
    total: number;
    limit: number;
    byTransport: { http: number; websocket: number };
    byUser: Record<string, number>;
  } {
    const stats = {
      total: this.sessions.size,
      limit: this.config.maxConcurrentSessions,
      byTransport: { http: 0, websocket: 0 },
      byUser: {} as Record<string, number>,
    };

    for (const session of this.sessions.values()) {
      // Count by transport
      stats.byTransport[session.transport]++;

      // Count by user
      stats.byUser[session.userId] = (stats.byUser[session.userId] || 0) + 1;
    }

    return stats;
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

    // Log session stats periodically (every 10 cleanups in dev)
    if (this.config.env !== "production") {
      const stats = this.getSessionStats();
      if (stats.total > stats.limit * 0.8) {
        // Log when >80% capacity
        this.logger.warn(
          `High session usage: ${stats.total}/${stats.limit}`,
          stats
        );
      } else if (stats.total > 10) {
        // Log stats when we have more than 10 sessions
        this.logger.debug(
          `Session stats: ${stats.total}/${stats.limit}`,
          stats
        );
      }
    }
  }
}
