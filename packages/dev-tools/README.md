# 🚀 Omni MCP Development CLI

**Server Capability Showcase & Testing** - Simplified CLI for exploring and testing MCP server
capabilities.

## 🎯 Quick Start

```bash
# Check if everything is running
pnpm omni-mcp health

# See what's available across all servers
pnpm omni-mcp showcase --examples

# Quick test all servers
pnpm omni-mcp test
```

## 🛠️ Main Commands

### 🎯 **Showcase** - Explore Server Capabilities

```bash
# Show all servers and their tools
pnpm omni-mcp showcase

# Show specific server with examples
pnpm omni-mcp showcase devtools --examples
pnpm omni-mcp showcase linear --examples
pnpm omni-mcp showcase perplexity --examples

# Test tools with example payloads
pnpm omni-mcp showcase devtools --test
```

### 🔧 **Quick Test** - Verify Everything Works

```bash
# Test all servers with basic functionality
pnpm omni-mcp test

# Test specific server only
pnpm omni-mcp test --server devtools
```

### 🏥 **Health Check** - System Status

```bash
# Check gateway and all servers
pnpm omni-mcp health
```

### ⚡ **Call Tool** - Direct Testing

```bash
# Call a tool directly
pnpm omni-mcp call chrome_start --args '{"headless": true}'
pnpm omni-mcp call linear_get_teams
```

### 🎮 **Interactive Mode** - Explore Dynamically

```bash
# Start interactive exploration
pnpm omni-mcp interactive
```

## 📊 Server Overview

### **Linear MCP Server** (Port: 3001)

- **linear_get_teams** - Retrieve team information
- **linear_get_users** - Get user lists with limits
- **linear_get_issues** - Query issues by state
- **linear_create_issue** - Create new issues
- **linear_search_issues** - Search with queries

### **Perplexity MCP Server** (Port: 3002)

- **perplexity_search** - AI-powered search with results limit
- **perplexity_research** - Deep research on topics
- **perplexity_compare** - Compare multiple topics
- **perplexity_summarize** - Text summarization

### **Chrome DevTools MCP Server** (Port: 3003)

**40 tools across 8 categories:**

- **Chrome Management** (5 tools) - Browser startup, navigation, status
- **Console Tools** (3 tools) - JavaScript execution, log capture
- **DOM Manipulation** (9 tools) - Element querying, modification, removal
- **Network Monitoring** (2 tools) - Request tracking, response analysis
- **CSS Inspection** (2 tools) - Style computation, rule analysis
- **Storage Tools** (3 tools) - localStorage, sessionStorage, cookies
- **Debugging Tools** (9 tools) - Breakpoints, stepping, evaluation
- **Error Handling** (6 tools) - Runtime, network, console error tracking
- **Screenshot** (1 tool) - Page capture

## 🚀 Example Usage

### Explore Chrome DevTools Capabilities

```bash
pnpm omni-mcp showcase devtools --examples
```

**Output:** Organized display of all 40 Chrome automation tools with example payloads

### Quick System Test

```bash
pnpm omni-mcp test
```

**Output:** Tests basic functionality across Linear, Perplexity, and Chrome DevTools servers

### Check System Health

```bash
pnpm omni-mcp health
```

**Output:** Gateway status + server tool counts + sample capabilities

### Call Specific Tools

```bash
# Start Chrome and navigate
pnpm omni-mcp call chrome_start --args '{"headless": false, "autoConnect": true}'
pnpm omni-mcp call chrome_navigate --args '{"url": "https://example.com"}'

# Get Linear teams
pnpm omni-mcp call linear_get_teams

# Search with Perplexity
pnpm omni-mcp call perplexity_search --args '{"query": "TypeScript best practices", "max_results": 5}'
```

## 🎯 Why This CLI?

### ✅ **Capability Discovery**

- **Visual organization** of tools by server and category
- **Example payloads** for immediate testing
- **Clear descriptions** of what each tool does

### ✅ **Quick Validation**

- **Health checks** ensure everything is running
- **Quick tests** verify basic functionality
- **Success rates** show system reliability

### ✅ **Developer Experience**

- **Simplified interface** focused on capabilities
- **Example-driven** approach to tool exploration
- **Immediate feedback** on tool availability and status

### ✅ **Testing Automation**

- **Scriptable commands** for CI/CD integration
- **JSON-RPC compliance** with proper error handling
- **Gateway integration** testing

## 🏗️ Architecture Support

This CLI validates the complete Omni MCP architecture:

- **Gateway Aggregation** - All servers accessible through single endpoint
- **Protocol Compliance** - JSON-RPC 2.0 + MCP specification
- **Server Health** - Individual server status and capability monitoring
- **Tool Discovery** - Dynamic capability enumeration and testing

## 🔧 Development Workflow

1. **Start Development**

   ```bash
   pnpm omni-mcp health    # Verify everything is running
   ```

2. **Explore Capabilities**

   ```bash
   pnpm omni-mcp showcase --examples    # See what's available
   ```

3. **Test Functionality**

   ```bash
   pnpm omni-mcp test    # Quick validation
   ```

4. **Develop & Debug**
   ```bash
   pnpm omni-mcp call <tool-name> --args '{...}'    # Test specific tools
   pnpm omni-mcp interactive    # Explore dynamically
   ```

---

**Total Capabilities:** 49 tools across 3 servers, ready for comprehensive automation and
integration workflows.
