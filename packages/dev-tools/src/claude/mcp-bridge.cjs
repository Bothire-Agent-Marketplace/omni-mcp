#!/usr/bin/env node

const http = require("http");

const GATEWAY_HOST = "localhost";
const GATEWAY_PORT = 37373;
const GATEWAY_PATH = "/mcp";

class MCPBridge {
  constructor() {
    this.messageBuffer = "";
    this.pendingRequests = 0;
    this.stdinEnded = false;
    this.setupStreams();
  }

  setupStreams() {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      this.messageBuffer += chunk;
      this.processBuffer();
    });

    process.stdin.on("end", () => {
      this.stdinEnded = true;
      this.checkForExit();
    });

    process.on("SIGINT", () => process.exit(0));
    process.on("SIGTERM", () => process.exit(0));
  }

  processBuffer() {
    let newlineIndex;
    while ((newlineIndex = this.messageBuffer.indexOf("\n")) !== -1) {
      const line = this.messageBuffer.slice(0, newlineIndex).trim();
      this.messageBuffer = this.messageBuffer.slice(newlineIndex + 1);

      if (line) {
        this.handleMessage(line);
      }
    }
  }

  async handleMessage(messageStr) {
    try {
      const message = JSON.parse(messageStr);
      this.pendingRequests++;
      const response = await this.forwardToGateway(message);
      process.stdout.write(JSON.stringify(response) + "\n");
      this.pendingRequests--;
      this.checkForExit();
    } catch (error) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
          data: error.message,
        },
      };
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
      this.pendingRequests--;
      this.checkForExit();
    }
  }

  forwardToGateway(message) {
    return new Promise((resolve) => {
      const postData = JSON.stringify(message);

      const options = {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: GATEWAY_PATH,
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
            const httpResponse = JSON.parse(data);

            // Check if it's already a JSON-RPC response (protocol methods)
            if (httpResponse.jsonrpc === "2.0") {
              resolve(httpResponse);
            } else if (httpResponse.success) {
              // Convert HTTP response back to JSON-RPC format (tool calls)
              resolve({
                jsonrpc: "2.0",
                id: message.id,
                result: httpResponse.data,
              });
            } else {
              resolve({
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: httpResponse.code || -32603,
                  message: httpResponse.error || "Unknown error",
                  data: httpResponse.data,
                },
              });
            }
          } catch (error) {
            resolve({
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: -32603,
                message: "Invalid response from gateway",
                data: error.message,
              },
            });
          }
        });
      });

      req.on("error", (error) => {
        resolve({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: "Connection error",
            data: error.message,
          },
        });
      });

      req.write(postData);
      req.end();
    });
  }

  checkForExit() {
    if (this.stdinEnded && this.pendingRequests === 0) {
      process.exit(0);
    }
  }
}

new MCPBridge();
