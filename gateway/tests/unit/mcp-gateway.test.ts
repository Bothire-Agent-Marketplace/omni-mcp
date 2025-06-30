import { MCPGateway } from "../../src/gateway/mcp-gateway";
import { MasterConfig } from "../../src/gateway/types";

// Mock all dependencies
jest.mock("@mcp/utils");
jest.mock("../../src/gateway/server-manager");
jest.mock("../../src/gateway/session-manager");
jest.mock("../../src/gateway/protocol-adapter");

describe("MCPGateway", () => {
  let gateway: MCPGateway;
  let mockConfig: MasterConfig;

  beforeEach(() => {
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
      // Mock the server manager initialization
      const mockServerManager = (gateway as any).serverManager;
      mockServerManager.initialize = jest.fn().mockResolvedValue(undefined);

      await expect(gateway.initialize()).resolves.not.toThrow();
      expect(mockServerManager.initialize).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      const mockServerManager = (gateway as any).serverManager;
      mockServerManager.initialize = jest
        .fn()
        .mockRejectedValue(new Error("Init failed"));

      await expect(gateway.initialize()).rejects.toThrow("Init failed");
    });
  });

  describe("shutdown", () => {
    it("should shutdown gracefully", async () => {
      const mockServerManager = (gateway as any).serverManager;
      const mockSessionManager = (gateway as any).sessionManager;

      mockServerManager.shutdown = jest.fn().mockResolvedValue(undefined);
      mockSessionManager.shutdown = jest.fn();

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
      const mockServerManager = (gateway as any).serverManager;
      const mockStatus = { "test-server": { instances: 1, healthy: 1 } };

      mockServerManager.getHealthStatus = jest.fn().mockReturnValue(mockStatus);

      const result = gateway.getHealthStatus();

      expect(result).toBe(mockStatus);
      expect(mockServerManager.getHealthStatus).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle server manager errors gracefully", async () => {
      const mockServerManager = (gateway as any).serverManager;
      mockServerManager.shutdown = jest
        .fn()
        .mockRejectedValue(new Error("Shutdown failed"));

      // Should not throw despite the error
      await expect(gateway.shutdown()).resolves.not.toThrow();
    });
  });
});
