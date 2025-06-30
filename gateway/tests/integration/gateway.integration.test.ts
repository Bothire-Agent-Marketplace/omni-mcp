import request from "supertest";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { MCPGateway } from "../../src/gateway/mcp-gateway";
import { MasterConfig } from "../../src/gateway/types";

// Mock the logger
jest.mock("@mcp/utils", () => ({
  Logger: {
    getInstance: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      getServiceName: jest.fn(() => "test-service"),
    })),
  },
}));

describe("MCP Gateway Integration Tests", () => {
  let app: express.Application;
  let server: any;
  let mcpGateway: MCPGateway;
  let testConfig: MasterConfig;

  beforeAll(async () => {
    // Create test configuration with mock servers
    testConfig = {
      servers: {
        "test-server": {
          type: "mcp",
          command: "echo",
          args: ["test"],
          cwd: process.cwd(),
          capabilities: ["test/method", "test/other"],
          description: "Test MCP Server",
          maxInstances: 1,
          healthCheckInterval: 30000,
        },
      },
      gateway: {
        port: 0, // Use random port for testing
        allowedOrigins: ["http://localhost:3000"],
        jwtSecret: "test-secret",
        sessionTimeout: 3600000,
        maxConcurrentSessions: 100,
      },
    };

    // Create Express app
    app = express();
    app.use(
      cors({
        origin: testConfig.gateway.allowedOrigins,
        credentials: true,
      })
    );
    app.use(express.json());

    // Initialize MCP Gateway (but don't start real servers for tests)
    mcpGateway = new MCPGateway(testConfig);

    // Mock the server manager to avoid spawning real processes
    const mockServerManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getServerInstance: jest.fn().mockResolvedValue(null),
      releaseServerInstance: jest.fn(),
      getHealthStatus: jest.fn().mockReturnValue({
        "test-server": {
          instances: 1,
          healthy: 1,
          capabilities: ["test/method", "test/other"],
          lastCheck: new Date().toISOString(),
        },
      }),
    };

    // Replace the server manager
    (mcpGateway as any).serverManager = mockServerManager;

    // Add routes
    app.get("/health", (req, res) => {
      const status = mcpGateway.getHealthStatus();
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        servers: status,
      });
    });

    app.post("/mcp", async (req, res) => {
      try {
        const response = await mcpGateway.handleHttpRequest(
          req.body,
          req.headers
        );
        res.json(response);
      } catch (error) {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Create HTTP server
    server = createServer(app);

    // Initialize gateway
    await mcpGateway.initialize();
  });

  afterAll(async () => {
    await mcpGateway.shutdown();
    if (server) {
      server.close();
    }
  });

  describe("Health Endpoint", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.servers).toBeDefined();
      expect(response.body.servers["test-server"]).toEqual({
        instances: 1,
        healthy: 1,
        capabilities: ["test/method", "test/other"],
        lastCheck: expect.any(String),
      });
    });
  });

  describe("MCP HTTP Endpoint", () => {
    it("should handle valid MCP requests", async () => {
      const mcpRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      };

      const response = await request(app)
        .post("/mcp")
        .send(mcpRequest)
        .expect(200);

      expect(response.body.success).toBeDefined();
      expect(response.body.sessionToken).toBeDefined();
    });

    it("should handle HTTP-style requests and convert to MCP", async () => {
      const httpRequest = {
        action: "create",
        resource: "test",
        params: { data: "test" },
      };

      const response = await request(app)
        .post("/mcp")
        .send(httpRequest)
        .expect(200);

      expect(response.body.success).toBeDefined();
      expect(response.body.sessionToken).toBeDefined();
    });

    it("should return error for invalid requests", async () => {
      const invalidRequest = {
        invalid: "request",
      };

      const response = await request(app)
        .post("/mcp")
        .send(invalidRequest)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should handle requests with session tokens", async () => {
      // First request to get a session token
      const initialRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      };

      const initialResponse = await request(app)
        .post("/mcp")
        .send(initialRequest)
        .expect(200);

      const sessionToken = initialResponse.body.sessionToken;
      expect(sessionToken).toBeDefined();

      // Second request with the session token
      const followupRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "test/method",
        params: {},
      };

      const followupResponse = await request(app)
        .post("/mcp")
        .set("Authorization", `Bearer ${sessionToken}`)
        .send(followupRequest)
        .expect(200);

      // Should not include a new session token since we provided one
      expect(followupResponse.body.sessionToken).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON gracefully", async () => {
      const response = await request(app)
        .post("/mcp")
        .send("invalid json")
        .type("json")
        .expect(400);

      // Express should handle this before our handler
    });

    it("should handle server errors gracefully", async () => {
      // Mock a server error
      const mockError = jest
        .fn()
        .mockRejectedValue(new Error("Test server error"));
      (mcpGateway as any).handleHttpRequest = mockError;

      const response = await request(app)
        .post("/mcp")
        .send({ test: "request" })
        .expect(500);

      expect(response.body.error).toBe("Internal server error");
      expect(response.body.message).toBe("Test server error");
    });
  });

  describe("CORS", () => {
    it("should include CORS headers for allowed origins", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
    });
  });
});

describe("WebSocket Integration Tests", () => {
  let server: any;
  let wss: WebSocketServer;
  let mcpGateway: MCPGateway;
  let testConfig: MasterConfig;
  let port: number;

  beforeAll(async () => {
    testConfig = {
      servers: {
        "test-server": {
          type: "mcp",
          command: "echo",
          args: ["test"],
          cwd: process.cwd(),
          capabilities: ["test/method"],
          description: "Test MCP Server",
          maxInstances: 1,
          healthCheckInterval: 30000,
        },
      },
      gateway: {
        port: 0,
        allowedOrigins: ["http://localhost:3000"],
        jwtSecret: "test-secret",
        sessionTimeout: 3600000,
        maxConcurrentSessions: 100,
      },
    };

    mcpGateway = new MCPGateway(testConfig);

    // Mock the server manager
    const mockServerManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getServerInstance: jest.fn().mockResolvedValue(null),
      releaseServerInstance: jest.fn(),
      getHealthStatus: jest.fn().mockReturnValue({}),
    };

    (mcpGateway as any).serverManager = mockServerManager;

    // Create HTTP server with WebSocket
    const app = express();
    server = createServer(app);
    wss = new WebSocketServer({ server, path: "/mcp/ws" });

    wss.on("connection", (ws) => {
      mcpGateway.handleWebSocketConnection(ws);
    });

    await mcpGateway.initialize();

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await mcpGateway.shutdown();
    wss.close();
    server.close();
  });

  it("should establish WebSocket connection and receive welcome message", (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/mcp/ws`);

    ws.on("open", () => {
      // Connection opened successfully
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === "connection") {
        expect(message.sessionId).toBeDefined();
        expect(message.sessionToken).toBeDefined();
        expect(message.capabilities).toBeInstanceOf(Array);

        ws.close();
        done();
      }
    });

    ws.on("error", done);
  });

  it("should handle MCP requests over WebSocket", (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/mcp/ws`);
    let welcomeReceived = false;

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === "connection" && !welcomeReceived) {
        welcomeReceived = true;

        // Send MCP request
        const mcpRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "test/method",
          params: {},
        };

        ws.send(JSON.stringify(mcpRequest));
      } else if (message.jsonrpc === "2.0") {
        // Received MCP response
        expect(message.id).toBe(1);
        expect(message.error || message.result).toBeDefined();

        ws.close();
        done();
      }
    });

    ws.on("error", done);
  });

  it("should handle invalid JSON over WebSocket", (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/mcp/ws`);
    let welcomeReceived = false;

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === "connection" && !welcomeReceived) {
        welcomeReceived = true;

        // Send invalid JSON
        ws.send("invalid json {");
      } else if (message.jsonrpc === "2.0" && message.error) {
        // Received error response
        expect(message.error.code).toBe(-32700);
        expect(message.error.message).toBe("Parse error");

        ws.close();
        done();
      }
    });

    ws.on("error", done);
  });
});
