# Claude Desktop MCP Routing Guide

## 🔀 **Two Routing Approaches**

### 1. **Gateway Routing** (Default for Dev & Enterprise)

```
Claude Desktop → MCP Gateway → Linear MCP Server
```

**Pros:** Centralized logging, production parity, session management
**Cons:** Minor additional complexity (handled by `make`)

### 2. **Direct Connection** (For Isolated Debugging)

```
Claude Desktop → Linear MCP Server (local node process)
```

**Pros:** Fast, simple, good for debugging a single server in isolation
**Cons:** No centralized logging, does not reflect production environment

## 🔧 **Configuration Commands**

| Command                      | Description                 | Use Case                      |
| ---------------------------- | --------------------------- | ----------------------------- |
| `make claude-config-dev`     | **Gateway (Default)**       | Standard local development    |
| `make claude-config-gateway` | All through gateway         | Alias for `claude-config-dev` |
| `make claude-config-direct`  | Direct connection to Linear | For isolated server debugging |
| `make claude-config-prod`    | Docker containers           | Production deployment         |

## 📊 **Logging Commands**

| Command             | Purpose                | Shows                             |
| ------------------- | ---------------------- | --------------------------------- |
| `make logs`         | All services real-time | Docker services with timestamps   |
| `make logs-local`   | Local server help      | Instructions for local monitoring |
| `make tail`         | Everything live        | Real-time tail of all activity    |
| `make test-all-mcp` | Test all servers       | Manual MCP server testing         |

## 🧪 **Testing Request Flow**

### Test Direct Connection to Linear

```bash
# Terminal 1: Real-time tail everything
make tail

# Terminal 2: Watch Claude Desktop config (if needed)
make claude-watch

# Claude Desktop: Try Linear MCP tools:
# - "Search Linear issues for Phoenix team"
```

### Test Gateway Routing (Now Default)

```bash
# Terminal 1: Start all services including gateway
make dev

# Terminal 2: Switch to gateway config (now the default)
make claude-config-dev

# Terminal 3: Real-time monitoring
make tail

# Claude Desktop: Try same MCP requests
# You'll see: Claude Desktop → Gateway → Linear MCP Server in real-time!
```

## 🔍 **Request Flow Visualization**

**Gateway (Default Dev):**

```
Claude Desktop Request → Gateway → Linear MCP Server → Linear API → Response
        ↓                  ↓
   (no local logs)    (gateway logs)
```

**Direct (For Debugging):**

```
Claude Desktop Request → Linear MCP Server (local) → Linear API → Response
                         (logs in Console.app)
```

## 🚀 **Recommended Development Workflow**

1.  **Default Development**: `make claude-config-dev` + `make tail` (real-time everything through the gateway).
2.  **Isolated Debugging**: `make claude-config-direct` to bypass the gateway and test the Linear server individually.
3.  **Local Servers**: `make logs-local` (for direct connections).
4.  **Debugging**: `make test-all-mcp` (manual testing).
