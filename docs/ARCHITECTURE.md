# Omni MCP Architecture

This document outlines the architectural vision for the Omni project and the concrete steps required to evolve our system from its current state to a scalable, serverless-ready deployment.

## 🎯 **Target Architecture: Hub-and-Spoke Microservices**

Our goal is a **distributed, multi-layered architecture** capable of managing 30+ MCP servers efficiently. This model provides the best balance of developer autonomy, scalability, and operational stability.

### **1. Hub-and-Spoke Proxy Layer**

- ✅ **Central MCP Gateway/Hub**: Acts as a reverse proxy and management layer that routes traffic to individual MCP servers.
- ✅ **Unified Client Interface**: Clients connect to a single gateway endpoint to access all server capabilities. The hub automatically namespaces capabilities to prevent conflicts.

### **2. Serverless-Ready Microservices**

For 30+ servers, a pure "one container per server" model is inefficient. We have adopted a serverless-first pattern where business logic is decoupled from the transport layer. This gives us the flexibility to deploy handlers as standalone containers or as individual serverless functions (e.g., AWS Lambda) in the future.

- ✅ **Container-Based Deployment**: MCP servers run as containerized services, communicating over a network.
- ✅ **Serverless / FaaS Ready**: The architecture has been refactored to make deploying individual handlers as serverless functions a simple infrastructure change, not a code rewrite.
- ⬜️ **Kubernetes Orchestration**: The containerized services are now designed for future orchestration with Kubernetes for auto-scaling, health checks, and service discovery.

### **3. Multi-Transport Strategy**

MCP supports multiple transport mechanisms that will be used strategically:

- ✅ **HTTP/SSE Transport**: This is now the primary method for remote communication between the gateway and MCP servers.
- ✅ **Streamable HTTP**: The modern protocol (2025-03-26) is preferred for its performance benefits.
- ✅ **STDIO Transport**: Has been phased out from gateway-to-server communication but is kept for CLI tools and legacy local development workflows.

---

## 🗺️ **Architectural Refactoring Plan & Checklist**

This section outlines the step-by-step plan that was executed to transition from the previous process-managed monorepo to the target serverless-ready architecture.

### **Phase 1: Decouple MCP Server Logic from Transport**

The goal of this phase was to refactor our MCP servers so their core business logic is not tied to a specific transport mechanism (like `stdio`). This was the key to making them serverless-ready.

- [x] **Refactor business logic into transport-agnostic "handler" functions.**
  - [x] Create `handlers.ts` in `linear-mcp-server` to contain pure business logic.
  - [x] Move `linear_search_issues` logic from `tools.ts` into its own handler in `handlers.ts`.
  - [x] Move remaining tool logic (`get_teams`, `get_users`, etc.) into handlers.
  - [x] Move resource and prompt logic into their own handlers.
- [x] **Update `tools.ts`, `resources.ts`, and `prompts.ts` to be simple wiring layers.**
  - [x] Modify `tools.ts` to import handlers from `handlers.ts`.
  - [x] The `registerTool` function will now only define the schema and call the appropriate handler, separating schema definition from implementation.

### **Phase 2: Transition MCP Servers to Standalone HTTP Services**

With the logic decoupled, we then exposed it via a network transport.

- [x] **Add Express.js as a dependency to `linear-mcp-server`.**
- [x] **Create an HTTP transport entrypoint in `linear-mcp-server`.**
  - [x] This server now listens on a port defined by an environment variable.
  - [x] It exposes an `/mcp` endpoint for handling JSON-RPC requests.
  - [x] It exposes a `/health` endpoint that returns a `200 OK` status for health checks.
- [x] **Update the `Dockerfile` for `linear-mcp-server` to expose its port and run the new HTTP server.**

### **Phase 3: Refactor Gateway into a Network Proxy**

The gateway's role was changed from a process manager to a smart network router.

- [x] **Update `master.config.dev.json` to define servers by URL.**
  - [x] Replaced `command`, `args`, and `cwd` properties with a single `url` property (e.g., `"url": "http://linear-mcp-server:3001"`).
- [x] **Rewrite `MCPServerManager` to be a network-aware service manager.**
  - [x] Removed all child-process management code (`spawn`, `kill`, `on('exit')`, etc.).
  - [x] Implemented network-based health checks using HTTP GET requests to the `/health` endpoint of each server.
  - [x] The `getServerInstance` method was simplified to return the server's configured URL.
- [x] **Modify the gateway's request routing logic.**
  - [x] The gateway now forwards incoming requests to the appropriate MCP server via an HTTP POST request to its `/mcp` endpoint.

### **Phase 4: Update Docker Orchestration**

Finally, we updated our Docker setup to run the newly independent services.

- [x] **Verify `docker-compose.dev.yml` correctly orchestrates the services.**
  - [x] Confirmed that `mcp-gateway` and `linear-mcp-server` are on the same Docker network.
- [x] **Update container `command`s in `docker-compose.dev.yml`.**
  - [x] The `command` for `linear-mcp-server` was updated to run its new HTTP server.

---

## ✅ **Current Implementation Status**

This checklist from the previous architecture shows what is already in place and serves as the foundation for our refactoring.

- ✅ **Hub-and-Spoke Architecture** - MCP Gateway configured.
- ✅ **Containerized Microservices** - Docker support exists for all servers.
- ✅ **Recommended Repository Structure** - Follows enterprise patterns.
- ✅ **Server-Specific Structure** - Linear MCP server implemented.
- ✅ **Core Components** - Tools, Resources, Prompts all implemented.
- ✅ **Communication Protocol** - JSON-RPC 2.0 via MCP SDK.
- ✅ **Transport Layer** - Multi-transport support via MCP SDK.
- ✅ **Lifecycle Management** - Proper init/message/termination handling.
- ✅ **Hierarchical Environment Variables** - Enterprise-grade config management.
- ✅ **Development Tools** - Watch scripts, dev tooling, client integrations.
