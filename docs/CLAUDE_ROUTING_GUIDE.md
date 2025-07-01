# Claude Desktop MCP Routing Guide

## 🔀 **Modern Gateway Architecture**

The MCP Gateway now operates as a **robust, network-based reverse proxy**. It provides a single, stable endpoint for clients and intelligently routes requests to the appropriate backend MCP microservices. This architecture is built for scalability, reliability, and production-grade performance.

### **Current Request Flow**

```
Claude Desktop → MCP Gateway → MCP Server (via HTTP)
     ↓              ↓                    ↓
  JSON-RPC     Health Checks &     Linear API, etc.
 (HTTP/WS)     Request Routing         ↓
     ↓                               Response
   Session
 Management
 (JWT)
```

## 🏗️ **Gateway Components**

### **1. MCP Gateway Core**

- **Protocol Adaptation**: Converts between client-facing HTTP/WebSocket and backend MCP HTTP requests.
- **Request Routing**: Maps capabilities listed in `master.config.dev.json` to the correct server URL.
- **Session Management**: Issues JWTs to track client sessions.

### **2. Server Manager**

- **Network Health Monitoring**: Periodically sends HTTP GET requests to each server's `/health` endpoint. Unhealthy servers are temporarily removed from the routing pool.
- **Configuration-Driven**: Manages a static list of servers defined by URL in the master config file. There is no on-demand spawning.
- **Load Balancing**: (Future) Can be extended to support multiple instances per service for load balancing.

### **3. Session Manager**

- **Multi-Protocol Support**: Handles standard HTTP and WebSocket connections.
- **Token Management**: JWT-based session authentication.
- **Concurrent Limits**: Configurable session limits for resource control.

## 🔧 **Configuration Commands**

| Command                      | Description                       | Use Case                      |
| ---------------------------- | --------------------------------- | ----------------------------- |
| `make claude-config-dev`     | **Gateway (Default)**             | Standard local development    |
| `make claude-config-gateway` | All through gateway               | Alias for `claude-config-dev` |
| `make claude-config-direct`  | Direct connection to Linear's URL | For isolated server debugging |
| `make claude-config-prod`    | Docker containers via Gateway     | Production deployment         |

## 📊 **Monitoring Commands**

| Command             | Purpose                | Shows                             |
| ------------------- | ---------------------- | --------------------------------- |
| `make logs`         | All services real-time | Docker services with timestamps   |
| `make logs-local`   | Local server help      | Instructions for local monitoring |
| `make tail`         | Everything live        | Real-time tail of all activity    |
| `make test-all-mcp` | Test all servers       | Manual MCP server testing         |

## 🚀 **Modern Request Flow Details**

### **1. Client Connection**

```
Claude Desktop → Gateway (HTTP/WebSocket on port 37373)
  ↓
Session Creation (JWT token issued)
  ↓
Capability Resolution (e.g., "linear_get_teams" maps to the Linear server URL)
```

### **2. Server Request**

```
Gateway sends HTTP POST to http://linear-mcp-server:3001/mcp
  ↓
Request contains the original JSON-RPC payload
  ↓
30-second timeout managed by the gateway
```

### **3. Request Execution**

```
Linear MCP Server receives request at its /mcp endpoint
  ↓
Server processes request (e.g., calls the actual Linear API)
  ↓
Response flows back through gateway to the client
```

### **4. Health & Recovery**

```
Gateway sends GET request to http://linear-mcp-server:3001/health every 30s
  ↓
If a server fails the health check, the gateway stops routing requests to it.
  ↓
When the server becomes healthy again, the gateway resumes routing.
```

## 🧪 **Testing Request Flow**

### **Test Gateway Routing (Default)**

```bash
# Terminal 1: Start all services
make dev

# Terminal 2: Check gateway health (includes backend server status)
curl http://localhost:37373/health | jq

# Terminal 3: Make a request through the gateway
curl -X POST http://localhost:37373/mcp -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "linear_get_teams"}, "id": 1}'

# Claude Desktop: Try MCP requests:
# - "Search Linear issues for Phoenix team"
```

**What you'll see in logs:**

1.  Session creation and JWT token generation.
2.  Gateway logging the request and which server URL it's proxying to.
3.  Linear MCP server logging the incoming request.
4.  Health check results appearing periodically.

## 🔍 **Request Flow Visualization**

### **Gateway Architecture (Production & Development)**

```mermaid
graph TD
    A[Claude Desktop] --> B{MCP Gateway<br/>(Reverse Proxy)}
    B --> |HTTP POST to /mcp| K[Linear MCP Server<br/>http://...:3001]
    B --> |HTTP POST to /mcp| M[Filesystem MCP Server<br/>http://...:3002]
    B --> |...| O[Other MCP Servers]

    subgraph "Gateway Health Checks"
      direction LR
      B-.->|GET /health| K
      B-.->|GET /health| M
      B-.->|GET /health| O
    end

    K --> N[Linear API]
    M --> P[File System]

    style B fill:#e1f5fe,stroke:#333,stroke-width:2px
    style K fill:#e8f5e8,stroke:#333,stroke-width:1px
    style M fill:#e8f5e8,stroke:#333,stroke-width:1px
    style O fill:#e8f5e8,stroke:#333,stroke-width:1px
```

### **Direct Connection (Debugging Only)**

This remains a useful pattern for isolating a single server.

```mermaid
graph TD
    A[Claude Desktop] --> B[Linear MCP Server<br/>http://localhost:3001]
    B --> C[Linear API]

    style B fill:#fff3e0
```

## 🔧 **Environment & Configuration**

### **Gateway Environment**

- **Centralized Config**: `gateway/master.config.dev.json` now defines server URLs.
- **Security**: Servers still manage their own API keys, loaded via their own `.env` files.
- **Timeouts**: Network timeouts are handled gracefully by the gateway.

### **Server Configuration (No more spawning)**

- **Static URLs**: Servers are defined by their network address in the gateway config.
- **Container Networking**: Docker's networking resolves hostnames (e.g., `http://linear-mcp-server:3001`).
- **Health Checks**: The `/health` endpoint is critical for a server to be considered "online" by the gateway.

## 🚀 **Recommended Development Workflow**

### **1. Default Development (Gateway)**

```bash
make dev              # Start all services
make claude-config-dev # Configure Claude Desktop
make tail             # Monitor everything in real-time
```

**Benefits**: Production parity, centralized logging, load balancing, session management

### **2. Isolated Debugging (Direct)**

```bash
make claude-config-direct  # Bypass gateway
make logs-local           # Monitor individual server
```

**Benefits**: Simpler debugging, direct server logs, faster iteration

### **3. Production Testing**

```bash
make claude-config-prod   # Use Docker containers
make logs                # Monitor containerized services
```

**Benefits**: Full production environment simulation

## 📈 **Performance & Monitoring**

### **Gateway Metrics**

- **Session Count**: Active JWT sessions
- **Instance Health**: Server availability per type
- **Load Distribution**: Requests per server instance
- **Response Times**: End-to-end latency

### **Health Endpoints**

- **Gateway Health**: `http://localhost:37373/health`
- **Server Status**: Instance counts and capabilities
- **Real-time Monitoring**: WebSocket connection for live updates

## 🛠️ **Troubleshooting**

### **Common Issues**

1.  **Server Unhealthy in Gateway**

    - `curl http://localhost:3001/health` directly. Does it return `{"status":"ok"}`?
    - Check the server logs (`docker logs omni-linear-mcp-server`) for errors on startup.
    - Ensure the server's `PORT` in its `.env` file matches the port in the gateway's config URL.

2.  **Gateway Request Fails (e.g., 500 error)**

    - Check the gateway logs (`docker logs omni-mcp-gateway`) for details. It will show the proxy error.
    - Check the target server's logs. It might be crashing when handling the request.
    - The server's API key might be missing or invalid.

3.  **Connection Refused**
    - Are all containers running? (`docker ps`)
    - Are the gateway and server on the same Docker network? (Check `docker-compose.dev.yml`)

### **Debug Commands**

```bash
# Check gateway configuration
cat gateway/master.config.dev.json

# Monitor server spawning
make tail | grep "server-manager"

# Test MCP handshake manually
make test-all-mcp

# Check environment variables
make env-debug
```
