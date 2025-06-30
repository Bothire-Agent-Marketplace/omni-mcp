import { MCPGateway } from "../../src/gateway/mcp-gateway";
import { MasterConfig } from "../../src/gateway/types";

// Mock the logger
jest.mock("@mcp/utils", () => ({
  Logger: {
    getInstance: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      getServiceName: jest.fn().mockReturnValue("test-service"),
    }),
  },
}));

// Mock other dependencies
const mockServerManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  getServerInstance: jest.fn(),
  releaseServerInstance: jest.fn(),
  getHealthStatus: jest.fn().mockReturnValue({}),
};

const mockSessionManager = {
  canCreateNewSession: jest.fn().mockReturnValue(true),
  createSession: jest.fn(),
  generateToken: jest.fn(),
  shutdown: jest.fn(),
  getSessionFromAuthHeader: jest.fn(),
  attachWebSocket: jest.fn(),
};

const mockProtocolAdapter = {
  handleHttpToMCP: jest.fn(),
  handleMCPToHttp: jest.fn(),
  handleWebSocketMessage: jest.fn(),
  sendWebSocketResponse: jest.fn(),
  sendMCPRequest: jest.fn(),
  resolveCapability: jest.fn(),
};

jest.mock("../../src/gateway/server-manager", () => ({
  ServerManager: jest.fn().mockImplementation(() => mockServerManager),
}));

jest.mock("../../src/gateway/session-manager", () => ({
  SessionManager: jest.fn().mockImplementation(() => mockSessionManager),
}));

jest.mock("../../src/gateway/protocol-adapter", () => ({
  ProtocolAdapter: jest.fn().mockImplementation(() => mockProtocolAdapter),
}));

describe("MCPGateway", () => {
  let gateway: MCPGateway;
  let mockConfig: MasterConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockConfig = {
      servers: {
        "test-server": {
          type: "mcp",
          command: "node",
          args: ["test.js"],
          cwd: "/test",
          capabilities: ["test/method"],
          description: "Test server",
          maxInstances: 2,
          healthCheckInterval: 30000,
        },
      },
      gateway: {
        port: 37373,
        allowedOrigins: ["http://localhost:3000"],
        jwtSecret: "test-secret",
        sessionTimeout: 3600000,
        maxConcurrentSessions: 100,
      },
    };

    gateway = new MCPGateway(mockConfig);
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(gateway.initialize()).resolves.not.toThrow();
      expect(mockServerManager.initialize).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      mockServerManager.initialize.mockRejectedValueOnce(
        new Error("Init failed")
      );

      await expect(gateway.initialize()).rejects.toThrow("Init failed");
    });
  });

  describe("shutdown", () => {
    it("should shutdown gracefully", async () => {
      await expect(gateway.shutdown()).resolves.not.toThrow();
      expect(mockServerManager.shutdown).toHaveBeenCalled();
      expect(mockSessionManager.shutdown).toHaveBeenCalled();
    });
  });

  describe("capability mapping", () => {
    it("should build capability map from config", () => {
      const capabilityMap = (gateway as any).capabilityMap;

      expect(capabilityMap.get("test-server")).toEqual(["test/method"]);
    });
  });

  describe("getHealthStatus", () => {
    it("should delegate to server manager", () => {
      const mockStatus = { "test-server": { instances: 1, healthy: 1 } };
      mockServerManager.getHealthStatus.mockReturnValue(mockStatus);

      const result = gateway.getHealthStatus();

      expect(result).toBe(mockStatus);
      expect(mockServerManager.getHealthStatus).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle server manager errors gracefully", async () => {
      mockServerManager.shutdown.mockRejectedValueOnce(
        new Error("Shutdown failed")
      );

      // Should not throw despite the error
      await expect(gateway.shutdown()).resolves.not.toThrow();
    });
  });
});
