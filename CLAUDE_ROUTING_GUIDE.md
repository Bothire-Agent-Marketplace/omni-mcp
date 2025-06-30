# Claude Desktop MCP Routing Guide

## 🔀 **Three Routing Approaches**

### 1. **Direct Connection** (Current Setup)

```
Claude Desktop → Linear MCP Server (local node process)
                ↘ Filesystem Server (Docker)
                ↘ Database Toolbox (Docker)
```

**Pros:** Fast, simple, direct
**Cons:** No centralized logging, no request routing/filtering

### 2. **Gateway Routing** (Enterprise Setup)

```
Claude Desktop → MCP Gateway → Linear MCP Server
                            ↘ Filesystem Server
                            ↘ Database Toolbox
```

**Pros:** Centralized logging, request routing, session management
**Cons:** Additional complexity, potential latency

### 3. **Hybrid** (Development Best Practice)

```
Claude Desktop → MCP Gateway (for production servers)
                ↘ Linear MCP Server (direct for development)
```

## 🔧 **Configuration Commands**

| Command                      | Description         | Use Case              |
| ---------------------------- | ------------------- | --------------------- |
| `make claude-config-dev`     | Direct connections  | Local development     |
| `make claude-config-gateway` | All through gateway | Enterprise/testing    |
| `make claude-config-prod`    | Docker containers   | Production deployment |

## 📊 **Logging Commands**

| Command              | Purpose                | Shows                             |
| -------------------- | ---------------------- | --------------------------------- |
| `make logs`          | All services real-time | Docker services with timestamps   |
| `make logs-mcp-only` | MCP servers only       | Just MCP containers               |
| `make logs-local`    | Local server help      | Instructions for local monitoring |
| `make tail`          | Everything live        | Real-time tail of all activity    |
| `make test-all-mcp`  | Test all servers       | Manual MCP server testing         |

## 🧪 **Testing Request Flow**

### Test Direct Connection (Current)

```bash
# Terminal 1: Real-time tail everything
make tail

# Terminal 2: Watch Claude Desktop config (if needed)
make claude-watch

# Claude Desktop: Try all MCP tools:
# - "Search Linear issues for Phoenix team"
# - "List files in my project directory"
# - "Show database tables"
# You'll see real-time activity in Terminal 1!
```

### Test Gateway Routing

```bash
# Terminal 1: Start all services including gateway
make dev

# Terminal 2: Switch to gateway config
make claude-config-gateway

# Terminal 3: Real-time monitoring
make tail

# Claude Desktop: Try same MCP requests
# You'll see: Claude Desktop → Gateway → All MCP Servers in real-time!
```

## 🔍 **Request Flow Visualization**

**Direct (Current):**

```
Claude Desktop Request → Linear MCP Server (local) → Linear API → Response
                       ↘ Filesystem Server (docker) → File System → Response
                       ↘ Database Toolbox (docker) → Database → Response
                         (logs in Console.app)      (docker logs)
```

**Gateway (Enterprise):**

```
Claude Desktop Request → Gateway → Linear MCP Server → Linear API → Response
        ↓                  ↓      ↘ Filesystem Server → File System → Response
   (no local logs)    (gateway   ↘ Database Toolbox → Database → Response
                       logs)        (all in docker logs)
```

## 🚀 **Recommended Development Workflow**

1. **Development**: `make claude-config-dev` + `make tail` (real-time everything)
2. **Testing Gateway**: `make claude-config-gateway` + `make tail`
3. **MCP Only**: `make logs-mcp-only` (just MCP servers)
4. **Local Servers**: `make logs-local` (for direct connections)
5. **Debugging**: `make test-all-mcp` (manual testing)
