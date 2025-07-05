#!/usr/bin/env node

/**
 * MCP Bridge Core - Shared HTTP/SSE to stdio bridge logic
 * Bridges Model Context Protocol between stdio-based clients and HTTP/SSE gateways
 */

import EventSource from "eventsource";

class MCPBridgeCore {
  constructor(gatewayUrl, options = {}) {
    this.gatewayUrl = gatewayUrl;
    this.options = {
      timeout: 30000,
      retries: 3,
      debug: false,
      ...options,
    };

    this.sseEndpoint = `${gatewayUrl}/sse`;
    this.messagesEndpoint = `${gatewayUrl}/messages`;
    this.eventSource = null;
    this.pendingRequests = new Map();
    this.isShuttingDown = false;

    this.log = this.options.debug ? console.error : () => {};
  }

  async start() {
    this.log(`🌉 Starting MCP Bridge Core → ${this.gatewayUrl}`);
    this.log(`📡 SSE endpoint: ${this.sseEndpoint}`);
    this.log(`📨 Messages endpoint: ${this.messagesEndpoint}`);

    await this.connectSSE();
    this.setupStdioHandlers();
    this.setupGracefulShutdown();

    this.log(`🚀 MCP Bridge Core running. Listening via STDIO...`);
  }

  connectSSE() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(this.sseEndpoint);

      this.eventSource.onopen = () => {
        this.log("✅ Connected to SSE backend");
        resolve();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          this.handleResponse(response);
        } catch (error) {
          this.log(`❌ Error parsing SSE message: ${error.message}`);
        }
      };

      this.eventSource.onerror = (error) => {
        this.log(`❌ SSE connection error: ${error}`);
        if (
          !this.eventSource.readyState ||
          this.eventSource.readyState === EventSource.CLOSED
        ) {
          reject(new Error("SSE connection failed"));
        }
      };
    });
  }

  setupStdioHandlers() {
    let inputBuffer = "";

    process.stdin.on("data", (chunk) => {
      inputBuffer += chunk.toString();

      // Process complete JSON messages
      let lines = inputBuffer.split("\n");
      inputBuffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          this.handleStdinMessage(line.trim());
        }
      }
    });

    process.stdin.on("end", () => {
      this.log("⛔ STDIN closed. Waiting for pending requests...");
      this.shutdown();
    });
  }

  async handleStdinMessage(message) {
    try {
      const request = JSON.parse(message);
      this.log(`--> ${JSON.stringify(request)}`);

      // Store pending request
      if (request.id) {
        this.pendingRequests.set(request.id, { timestamp: Date.now() });
      }

      await this.sendToGateway(request);
    } catch (error) {
      this.log(`❌ Error handling stdin message: ${error.message}`);
      this.sendErrorResponse(null, error.message);
    }
  }

  async sendToGateway(request) {
    this.log("📤 Sending request to gateway...");

    try {
      const response = await fetch(this.messagesEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      this.log(`📥 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(
          `Gateway responded with ${response.status}: ${response.statusText}`
        );
      }

      const responseText = await response.text();
      this.log(`📦 Response length: ${responseText.length}`);

      // For non-SSE responses, handle immediately
      if (responseText.trim()) {
        try {
          const jsonResponse = JSON.parse(responseText);
          this.handleResponse(jsonResponse);
        } catch (parseError) {
          this.log(`❌ Error parsing response: ${parseError.message}`);
          this.sendErrorResponse(
            request.id,
            "Invalid JSON response from gateway"
          );
        }
      }
    } catch (error) {
      this.log(`❌ Error sending to gateway: ${error.message}`);
      this.sendErrorResponse(request.id, error.message);
    }
  }

  handleResponse(response) {
    if (response.id && this.pendingRequests.has(response.id)) {
      this.pendingRequests.delete(response.id);
    }

    const responseStr = JSON.stringify(response);
    this.log(`<-- Response sent to client`);

    process.stdout.write(responseStr + "\n");
  }

  sendErrorResponse(requestId, errorMessage) {
    const errorResponse = {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: errorMessage,
      },
    };

    this.handleResponse(errorResponse);
  }

  setupGracefulShutdown() {
    const signals = ["SIGTERM", "SIGINT", "SIGUSR2"];

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.log(`🛑 Received ${signal}, shutting down gracefully...`);
        this.shutdown();
      });
    });
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    // Wait for pending requests with timeout
    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();

    while (this.pendingRequests.size > 0 && Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.log("⛔ Exiting...");
    process.exit(0);
  }
}

export default MCPBridgeCore;
