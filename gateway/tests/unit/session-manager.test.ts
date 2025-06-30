import { SessionManager } from "../../src/gateway/session-manager";
import { GatewayConfig } from "../../src/gateway/types";

// Mock the logger
jest.mock("@mcp/utils", () => ({
  Logger: {
    getInstance: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let mockConfig: GatewayConfig;

  beforeEach(() => {
    mockConfig = {
      port: 37373,
      allowedOrigins: ["http://localhost:3000"],
      jwtSecret: "test-secret",
      sessionTimeout: 3600000, // 1 hour
      maxConcurrentSessions: 10,
    };

    sessionManager = new SessionManager(mockConfig);
  });

  afterEach(() => {
    sessionManager.shutdown();
  });

  describe("createSession", () => {
    it("should create a new session with default values", () => {
      const session = sessionManager.createSession();

      expect(session.id).toBeDefined();
      expect(session.userId).toBe("anonymous");
      expect(session.transport).toBe("http");
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
      expect(session.serverConnections).toBeInstanceOf(Map);
    });

    it("should create a session with custom values", () => {
      const session = sessionManager.createSession("test-user", "websocket");

      expect(session.userId).toBe("test-user");
      expect(session.transport).toBe("websocket");
    });
  });

  describe("getSession", () => {
    it("should retrieve existing session and update last activity", (done) => {
      const session = sessionManager.createSession();
      const originalActivity = session.lastActivity;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        try {
          const retrieved = sessionManager.getSession(session.id);

          expect(retrieved).toBeDefined();
          expect(retrieved!.id).toBe(session.id);
          expect(retrieved!.lastActivity.getTime()).toBeGreaterThan(
            originalActivity.getTime()
          );
          done();
        } catch (error) {
          done(error);
        }
      }, 10);
    });

    it("should return null for non-existent session", () => {
      const result = sessionManager.getSession("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("generateToken and validateToken", () => {
    it("should generate and validate valid tokens", () => {
      const session = sessionManager.createSession();
      const token = sessionManager.generateToken(session.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const validatedSessionId = sessionManager.validateToken(token);
      expect(validatedSessionId).toBe(session.id);
    });

    it("should reject invalid tokens", () => {
      const invalidToken = "invalid.token.here";
      const result = sessionManager.validateToken(invalidToken);

      expect(result).toBeNull();
    });

    it("should reject tokens with wrong secret", () => {
      // Create token with different secret
      const jwt = require("jsonwebtoken");
      const badToken = jwt.sign({ sessionId: "test" }, "wrong-secret");

      const result = sessionManager.validateToken(badToken);
      expect(result).toBeNull();
    });
  });

  describe("getSessionFromAuthHeader", () => {
    it("should extract session from valid Bearer token", () => {
      const session = sessionManager.createSession();
      const token = sessionManager.generateToken(session.id);
      const authHeader = `Bearer ${token}`;

      const result = sessionManager.getSessionFromAuthHeader(authHeader);

      expect(result).toBeDefined();
      expect(result!.id).toBe(session.id);
    });

    it("should return null for invalid auth header format", () => {
      const result = sessionManager.getSessionFromAuthHeader("Invalid header");
      expect(result).toBeNull();
    });

    it("should return null for missing auth header", () => {
      const result = sessionManager.getSessionFromAuthHeader("");
      expect(result).toBeNull();
    });
  });

  describe("canCreateNewSession", () => {
    it("should allow creating sessions under the limit", () => {
      expect(sessionManager.canCreateNewSession()).toBe(true);
    });

    it("should prevent creating sessions over the limit", () => {
      // Create sessions up to the limit
      for (let i = 0; i < mockConfig.maxConcurrentSessions; i++) {
        sessionManager.createSession();
      }

      expect(sessionManager.canCreateNewSession()).toBe(false);
    });
  });

  describe("removeSession", () => {
    it("should remove existing session", () => {
      const session = sessionManager.createSession();

      expect(sessionManager.getSession(session.id)).toBeDefined();

      sessionManager.removeSession(session.id);

      expect(sessionManager.getSession(session.id)).toBeNull();
    });

    it("should handle removing non-existent session gracefully", () => {
      expect(() => {
        sessionManager.removeSession("non-existent-id");
      }).not.toThrow();
    });
  });

  describe("attachWebSocket", () => {
    it("should attach WebSocket to existing session", () => {
      const session = sessionManager.createSession();
      const mockWs = { close: jest.fn() } as any;

      const result = sessionManager.attachWebSocket(session.id, mockWs);

      expect(result).toBe(true);

      const retrievedSession = sessionManager.getSession(session.id);
      expect(retrievedSession!.connection).toBe(mockWs);
      expect(retrievedSession!.transport).toBe("websocket");
    });

    it("should return false for non-existent session", () => {
      const mockWs = { close: jest.fn() } as any;
      const result = sessionManager.attachWebSocket("non-existent-id", mockWs);

      expect(result).toBe(false);
    });
  });
});
