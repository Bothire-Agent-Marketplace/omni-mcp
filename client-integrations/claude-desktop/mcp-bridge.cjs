#!/usr/bin/env node

const http = require("http");

// MCP bridge that connects Claude Desktop (stdio) to Omni Gateway (HTTP)
class MCPBridge {
  constructor() {
    this.gatewayUrl = "http://localhost:3000/mcp";
    this.setupStdio();
  }

  setupStdio() {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (data) => {
      this.handleMCPMessage(data.trim());
    });
  }

  async handleMCPMessage(message) {
    try {
      const mcpRequest = JSON.parse(message);

      // Forward to gateway
      const response = await this.forwardToGateway(mcpRequest);

      // Send response back to Claude Desktop
      process.stdout.write(JSON.stringify(response) + "\n");
    } catch (error) {
      // Send error response
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: "Internal error",
          data: error.message,
        },
      };
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
    }
  }

  async forwardToGateway(mcpRequest) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(mcpRequest);

      const options = {
        hostname: "localhost",
        port: 3000,
        path: "/mcp",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (_error) {
            reject(new Error("Invalid JSON response from gateway"));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}

// Start the bridge
new MCPBridge();
