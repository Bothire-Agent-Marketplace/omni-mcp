#!/usr/bin/env node

// Simple test script to verify MCP Gateway functionality
const http = require("http");

// Test configuration
const GATEWAY_URL = "http://localhost:37373";

async function testHealthEndpoint() {
  console.log("\n🔍 Testing Health Endpoint...");

  return new Promise((resolve, reject) => {
    const req = http.get(`${GATEWAY_URL}/health`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          console.log("✅ Health check passed:", result.status);
          console.log(
            "📊 Server status:",
            JSON.stringify(result.servers, null, 2)
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(5000, () => reject(new Error("Health check timeout")));
  });
}

async function testMCPEndpoint() {
  console.log("\n🔍 Testing MCP Endpoint...");

  // Test with a simple MCP request (initialize)
  const testRequest = {
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

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testRequest);

    const options = {
      hostname: "localhost",
      port: 37373,
      path: "/mcp",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          console.log(
            "✅ MCP endpoint responded:",
            result.success ? "Success" : "Error"
          );
          console.log("📝 Response:", JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(10000, () => reject(new Error("MCP request timeout")));
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("🚀 Starting MCP Gateway Tests...");

  try {
    // Test 1: Health endpoint
    await testHealthEndpoint();

    // Test 2: MCP endpoint
    await testMCPEndpoint();

    console.log("\n✅ All tests completed successfully!");
    console.log("\n🎉 Your MCP Gateway is working properly!");
    console.log("\n📖 Usage:");
    console.log("   • Health Check: GET http://localhost:37373/health");
    console.log("   • MCP Requests: POST http://localhost:37373/mcp");
    console.log("   • WebSocket: ws://localhost:37373/mcp/ws");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\n💡 Make sure the gateway is running with: pnpm dev");
    process.exit(1);
  }
}

// Run tests
runTests();
