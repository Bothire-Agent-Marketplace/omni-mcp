import { Session, GatewayConfig, HTTPHeaders, IWebSocket } from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";
import { MCPSessionManager } from "../session-manager.js";

/**
 * Handles session management and organization context
 * Responsible for: session creation, validation, context extraction
 */
export class SessionAdapter {
  private logger: McpLogger;
  private sessionManager: MCPSessionManager;

  constructor(config: GatewayConfig, logger: McpLogger) {
    this.logger = logger.fork("session-adapter");
    this.sessionManager = new MCPSessionManager(
      config,
      this.logger.fork("session-manager")
    );
  }

  /**
   * Get or create session from HTTP headers
   */
  async getOrCreateSession(headers: HTTPHeaders): Promise<Session> {
    // Try to get existing session first
    let session = this.getSessionFromHeaders(headers);

    if (!session) {
      if (!this.sessionManager.canCreateNewSession()) {
        throw new Error("Maximum concurrent sessions reached");
      }

      // Extract authentication and context from headers
      const authHeader = headers.authorization || headers.Authorization;
      const apiKey = headers["x-api-key"] as string;
      const simulateOrgHeader = headers["x-simulate-organization"] as string;

      // Create session with organization context
      session = await this.sessionManager.createSessionWithAuth(
        authHeader,
        apiKey,
        "http",
        simulateOrgHeader
      );

      this.logger.info("Created new session", {
        sessionId: session.id,
        organizationId: session.organizationId,
        simulateContext: !!simulateOrgHeader,
      });
    } else {
      this.logger.debug("Using existing session", {
        sessionId: session.id,
        organizationId: session.organizationId,
      });
    }

    return session;
  }

  /**
   * Create session for WebSocket connections
   */
  createWebSocketSession(userId?: string): Session {
    const session = this.sessionManager.createSession(
      userId || "websocket-user",
      "websocket"
    );

    this.logger.info("Created WebSocket session", {
      sessionId: session.id,
      userId,
    });

    return session;
  }

  /**
   * Attach WebSocket to session
   */
  attachWebSocket(sessionId: string, ws: IWebSocket): void {
    this.sessionManager.attachWebSocket(sessionId, ws);
    this.logger.debug("Attached WebSocket to session", { sessionId });
  }

  /**
   * Generate session token
   */
  generateSessionToken(sessionId: string): string {
    return this.sessionManager.generateToken(sessionId);
  }

  /**
   * Remove session
   */
  removeSession(sessionId: string): void {
    this.sessionManager.removeSession(sessionId);
    this.logger.info("Removed session", { sessionId });
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    active: number;
    canCreateNew: boolean;
  } {
    return {
      active: this.sessionManager.getActiveSessionCount(),
      canCreateNew: this.sessionManager.canCreateNewSession(),
    };
  }

  /**
   * Shutdown session manager
   */
  shutdown(): void {
    this.sessionManager.shutdown();
    this.logger.info("Session adapter shutdown complete");
  }

  private getSessionFromHeaders(headers: HTTPHeaders): Session | null {
    const authHeader = headers.authorization || headers.Authorization;
    return authHeader
      ? this.sessionManager.getSessionFromAuthHeader(authHeader)
      : null;
  }
}
