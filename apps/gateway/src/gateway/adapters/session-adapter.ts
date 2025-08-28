import {
  Session,
  McpGatewayConfig,
  HTTPHeaders,
  IWebSocket,
} from "@mcp/schemas";
import { McpLogger } from "@mcp/utils";
import { MCPSessionManager } from "../session-manager.js";

export class SessionAdapter {
  private logger: McpLogger;
  private sessionManager: MCPSessionManager;

  constructor(config: McpGatewayConfig, logger: McpLogger) {
    this.logger = logger.fork("session-adapter");
    this.sessionManager = new MCPSessionManager(
      config,
      this.logger.fork("session-manager")
    );
  }

  async getOrCreateSession(headers: HTTPHeaders): Promise<Session> {
    let session = this.getSessionFromHeaders(headers);

    if (!session) {
      if (!this.sessionManager.canCreateNewSession()) {
        throw new Error("Maximum concurrent sessions reached");
      }

      const authHeader = headers.authorization || headers.Authorization;
      const apiKey = headers["x-api-key"] as string;
      const simulateOrgHeader = headers["x-simulate-organization"] as string;

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

  attachWebSocket(sessionId: string, ws: IWebSocket): void {
    this.sessionManager.attachWebSocket(sessionId, ws);
    this.logger.debug("Attached WebSocket to session", { sessionId });
  }

  generateSessionToken(sessionId: string): string {
    return this.sessionManager.generateToken(sessionId);
  }

  removeSession(sessionId: string): void {
    this.sessionManager.removeSession(sessionId);
    this.logger.info("Removed session", { sessionId });
  }

  getSessionStats(): {
    active: number;
    canCreateNew: boolean;
  } {
    return {
      active: this.sessionManager.getActiveSessionCount(),
      canCreateNew: this.sessionManager.canCreateNewSession(),
    };
  }

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
