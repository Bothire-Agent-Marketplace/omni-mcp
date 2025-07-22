import jwt, { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Session, GatewayConfig, IWebSocket } from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";
import {
  OrganizationContextService,
  OrganizationContext,
} from "../services/organization-context.js";

interface SessionJwtPayload extends JwtPayload {
  sessionId: string;
  timestamp: number;
}

export class MCPSessionManager {
  private logger: McpLogger;
  private sessions = new Map<string, Session>();
  private config: GatewayConfig;
  private cleanupInterval: NodeJS.Timeout;
  private orgContextService: OrganizationContextService;

  constructor(config: GatewayConfig, logger: McpLogger) {
    this.config = config;
    this.logger = logger;
    this.orgContextService = new OrganizationContextService(
      config.jwtSecret,
      logger
    );

    // Start session cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Clean up every minute
  }

  async shutdown(): Promise<void> {
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
   * Create session with organization context extracted from auth headers
   * Now supports organization context simulation for testing
   */
  async createSessionWithAuth(
    authHeader?: string,
    apiKey?: string,
    transport: "http" | "websocket" = "http",
    simulateOrgHeader?: string
  ): Promise<Session> {
    // First get the user's actual organization context
    const orgContext = await this.orgContextService.extractOrganizationContext(
      authHeader,
      apiKey
    );

    const userId = orgContext?.userClerkId || "anonymous";

    // Check if we're simulating a different organization context
    if (simulateOrgHeader && orgContext) {
      // Validate that the user has permission to simulate this organization
      const hasPermission = await this.validateSimulationPermission(
        orgContext,
        simulateOrgHeader
      );

      if (hasPermission) {
        // Create simulated organization context
        const simulatedContext = await this.createSimulatedContext(
          orgContext,
          simulateOrgHeader
        );

        if (simulatedContext) {
          const session = this.createSession(
            userId,
            transport,
            simulatedContext
          );
          this.logger.info(
            `Created testing session with simulated organization context`,
            {
              actualOrgId: orgContext.organizationClerkId,
              simulatedOrgId: simulateOrgHeader,
              userId: orgContext.userClerkId,
              sessionId: session.id,
            }
          );
          return session;
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

    return this.createSession(userId, transport, orgContext || undefined);
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
