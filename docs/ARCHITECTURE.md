# Omni MCP Architecture

Enterprise-grade MCP (Model Context Protocol) platform with gateway routing, microservice orchestration, and developer tooling.

## 🎯 System Overview

Omni implements a **hub-and-spoke microservices architecture** optimized for scalability, developer productivity, and operational reliability. The system currently manages multiple MCP servers through a centralized gateway with automatic service discovery and routing.

## 🏗️ Core Components

### **1. MCP Gateway Hub**

- **Central Router**: Single entry point (`localhost:37373`) that routes MCP requests to appropriate backend servers
- **Service Discovery**: Automatic detection and health monitoring of registered MCP servers
- **Protocol Translation**: Handles MCP 2.0 JSON-RPC protocol routing and response aggregation
- **Health Monitoring**: Continuous health checks with automatic failover capabilities

### **2. HTTP-Based MCP Servers**

- **Containerized Microservices**: Each MCP server runs as an independent HTTP service
- **Auto-Port Management**: Automatic port assignment starting from 3001, with conflict detection
- **Standardized Interface**: All servers expose `/health` and `/mcp` endpoints for consistent management
- **Hot Reload Development**: Live code updates during development without container restarts

### **3. Developer Tooling**

- **CLI Management**: `pnpm omni` command suite for server lifecycle management
- **Validation System**: Automated compliance checking against enterprise patterns
- **Scaffolding**: Template-based server generation with best practices built-in
- **Workspace Integration**: Automatic configuration updates across Docker Compose, gateway configs, and workspace files

## 📐 Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude/Client │    │   MCP Gateway   │    │  MCP Server A   │
│                 │◄──►│   (Port 37373)  │◄──►│   (Port 3001)   │
│                 │    │                 │    │                 │
└─────────────────┘    │  ┌───────────┐  │    └─────────────────┘
                       │  │  Router   │  │    ┌─────────────────┐
                       │  │  Health   │  │◄──►│  MCP Server B   │
                       │  │  Monitor  │  │    │   (Port 3002)   │
                       │  └───────────┘  │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 Implementation Details

### **Transport Protocol**

- **HTTP/JSON-RPC**: Primary communication protocol for gateway-to-server communication
- **Server-Sent Events**: Used for streaming responses and real-time updates
- **Health Checks**: RESTful endpoints for service monitoring and discovery

### **Service Registration**

- **Configuration-Driven**: Services for the development environment are defined directly within the `getMCPServersConfig` function in `@mcp/utils/src/env.ts`. For production, configurations are loaded from environment variables.
- **Docker Compose Integration**: Automatic service orchestration and networking
- **Dynamic Discovery**: Gateway polls registered services for availability

### **Development Workflow**

1. **Create**: `pnpm omni create` - Scaffold new MCP server with templates
2. **Validate**: `pnpm omni validate` - Check compliance with enterprise patterns
3. **Deploy**: `pnpm dev` - Start all services with hot reload
4. **Monitor**: Built-in health checks and logging

## 📦 Deployment Architecture

### **Development Environment**

- **Turbo Build System**: Fast, incremental builds with intelligent caching
- **pnpm Workspace**: Monorepo management with efficient dependency resolution
- **Development Commands**: `pnpm dev` for local development, `pnpm build` for production builds

### **Production Considerations**

- **Container Registry**: Docker images built with multi-stage optimization
- **Health Monitoring**: Kubernetes-ready health check endpoints
- **Scaling Strategy**: Horizontal scaling per service with load balancing
- **Security**: Non-root containers with minimal attack surface

## 🚀 Scalability Features

- **Horizontal Scaling**: Each MCP server scales independently
- **Automatic Port Management**: CLI prevents port conflicts across services
- **Service Isolation**: Failures in one server don't affect others
- **Configuration Management**: Centralized config with per-service overrides
- **Monitoring Ready**: Structured logging and health check endpoints

## 🛠️ Development Standards

### **Server Compliance**

- Express.js HTTP server with `/health` and `/mcp` endpoints
- TypeScript with Zod validation for type safety
- Dockerfile with multi-stage builds for optimization
- Integration with shared utilities and workspace patterns

### **Quality Assurance**

- **Validation Pipeline**: `pnpm omni validate` checks 9 compliance criteria
- **Code Standards**: TypeScript strict mode with ESLint configuration
- **Testing Strategy**: Health check endpoints for service verification
- **Documentation**: Auto-generated server templates with usage examples

---

**Architecture Status**: ✅ **Production Ready** - System successfully manages multiple MCP servers with automatic scaling, health monitoring, developer tooling, and full Claude Desktop integration.

## 🎯 Claude Desktop Integration

The system includes a complete Claude Desktop integration with stdio-to-HTTP bridge:

- **Bridge Component**: `packages/dev-tools/src/claude/mcp-bridge.cjs` handles protocol conversion
- **Automatic Configuration**: Config watcher syncs changes to Claude Desktop
- **Tool Access**: All 11 tools (5 Linear + 6 QueryQuill) available in Claude Desktop
- **Protocol Compliance**: Full MCP 2.0 JSON-RPC support with proper error handling
