# MCP Gateway

A sophisticated **MCP Protocol Multiplexer** that enables seamless communication between clients and multiple MCP servers through a unified interface. The gateway provides HTTP, WebSocket, and native MCP protocol support with enterprise-grade features.

## 🏗️ Architecture

The MCP Gateway implements a **Hub-and-Spoke** architecture with these core components:

### **Protocol Adapter Layer**

- **HTTP/JSON-RPC** ↔ **MCP Protocol** translation
- **WebSocket** ↔ **MCP Protocol** bridging
- **Request/Response** format conversion and validation

### **Server Manager**

- **Process Spawning**: Manages MCP server child processes
- **Load Balancing**: Least-connections algorithm for optimal performance
- **Health Monitoring**: Automatic health checks and recovery
- **Connection Pooling**: Efficient server instance reuse

### **Session Management**

- **JWT Authentication**: Secure session tokens
- **WebSocket Support**: Persistent bidirectional connections
- **Session State**: Automatic cleanup and expiration handling

### **Routing Engine**

- **Capability-Based Routing**: Routes requests by method patterns
- **Pattern Matching**: Supports wildcards (`linear/*`, `filesystem/*`)
- **Load Distribution**: Balances requests across server instances

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- TypeScript 5.3+
- MCP SDK installed

### Installation

```bash
# Install dependencies
pnpm install

# Build the gateway
pnpm build

# Start in development mode
pnpm dev

# Start in production mode
pnpm start
```

### Configuration

Configure your MCP servers in `master.config.json`:

```json
{
  "servers": {
    "linear": {
      "type": "mcp",
      "command": "node",
      "args": ["../servers/linear-mcp-server/dist/index.js"],
      "cwd": "./gateway",
      "capabilities": [
        "linear/issues/list",
        "linear/issues/create",
        "linear/issues/update"
      ],
      "description": "Linear MCP Server for issue tracking",
      "maxInstances": 3,
      "healthCheckInterval": 30000
    }
  },
  "gateway": {
    "port": 37373,
    "allowedOrigins": ["http://localhost:3000"],
    "jwtSecret": "your-secret-key",
    "sessionTimeout": 3600000,
    "maxConcurrentSessions": 100
  }
}
```

## 📡 API Endpoints

### Health Check

```http
GET /health
```

Returns gateway and server health status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "servers": {
    "linear": {
      "instances": 2,
      "healthy": 2,
      "capabilities": ["linear/issues/list", "linear/issues/create"],
      "lastCheck": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### MCP HTTP Endpoint

```http
POST /mcp
Content-Type: application/json
Authorization: Bearer <session-token>
```

**MCP JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "linear/issues/create",
  "params": {
    "title": "New Issue",
    "description": "Issue description"
  }
}
```

**HTTP-Style Request:**

```json
{
  "action": "create",
  "resource": "issues",
  "params": {
    "title": "New Issue",
    "description": "Issue description"
  }
}
```

### WebSocket Endpoint

```
ws://localhost:37373/mcp/ws
```

Supports bidirectional MCP communication with automatic session management.

## 🧪 Testing

We provide comprehensive test coverage for all gateway components:

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Integration Tests Only

```bash
pnpm test:integration
```

### Generate Coverage Report

```bash
pnpm test:coverage
```

### Test Structure

- **Unit Tests**: `tests/unit/` - Individual component testing
- **Integration Tests**: `tests/integration/` - Full gateway workflow testing
- **Test Utilities**: `tests/setup.ts` - Shared test configuration

### Test Coverage

Our tests cover:

- ✅ **Protocol Adapter**: HTTP ↔ MCP conversion
- ✅ **Session Manager**: JWT tokens, WebSocket handling
- ✅ **Server Manager**: Process management, health checks
- ✅ **Gateway Core**: Request routing, error handling
- ✅ **Integration**: End-to-end HTTP and WebSocket workflows

### Example Test Usage

```bash
# Test the gateway manually
node test-gateway.js

# Expected output:
# 🚀 Starting MCP Gateway Tests...
# ✅ Health check passed: healthy
# ✅ MCP endpoint responded: Success
# 🎉 Your MCP Gateway is working properly!
```

## 🔧 Development

### Project Structure

```
gateway/
├── src/
│   ├── gateway/
│   │   ├── mcp-gateway.ts      # Main gateway orchestrator
│   │   ├── protocol-adapter.ts # Protocol translation layer
│   │   ├── server-manager.ts   # MCP server process management
│   │   ├── session-manager.ts  # Client session handling
│   │   └── types.ts           # TypeScript definitions
│   └── index.ts               # Gateway entry point
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── setup.ts              # Test configuration
├── master.config.json         # Server configuration
└── test-gateway.js           # Manual testing script
```

### Adding New MCP Servers

1. **Configure Server**: Add to `master.config.json`
2. **Define Capabilities**: List all available methods
3. **Test Integration**: Verify routing and health checks
4. **Update Documentation**: Add capability descriptions

### Debugging

Set environment variables for detailed logging:

```bash
LOG_LEVEL=debug pnpm dev
```

### Performance Monitoring

The gateway includes built-in metrics:

- Request latency tracking
- Server health status
- Session management statistics
- Connection pool utilization

## 🛡️ Security Features

- **JWT Session Tokens**: Secure client authentication
- **CORS Protection**: Configurable origin restrictions
- **Process Isolation**: MCP servers run as separate processes
- **Input Validation**: Request sanitization and validation
- **Error Boundaries**: Graceful error handling and recovery

## 🔄 Load Balancing

The gateway implements **least-connections** load balancing:

1. Routes requests to servers with the fewest active connections
2. Automatically scales server instances based on load
3. Performs health checks and removes unhealthy instances
4. Distributes capability requests across available servers

## 📈 Scaling

For production deployments:

- **Horizontal Scaling**: Run multiple gateway instances
- **Server Scaling**: Configure `maxInstances` per server type
- **Connection Limits**: Adjust `maxConcurrentSessions`
- **Health Check Tuning**: Optimize `healthCheckInterval`

## 🐛 Troubleshooting

**Gateway won't start:**

- Check MCP server paths in `master.config.json`
- Verify all dependencies are installed
- Ensure ports are available

**Servers not responding:**

- Check server health via `/health` endpoint
- Verify server capabilities match request methods
- Review gateway logs for process spawn errors

**WebSocket connection issues:**

- Confirm WebSocket path: `/mcp/ws`
- Check CORS settings for client origin
- Verify session token validity

## 📚 Additional Resources

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Development Setup](../README.md)

---

The MCP Gateway transforms your MCP servers into a unified, scalable, and production-ready service architecture. 🚀
