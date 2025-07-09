# Chrome DevTools MCP Server

A streamlined Model Context Protocol (MCP) server providing essential Chrome browser debugging
capabilities through the Chrome DevTools Protocol (CDP). Focused on the core debugging tools you
need most: console and network monitoring.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start the server
pnpm run start
```

The server runs on **port 3004** by default.

## 🛠️ Current Capabilities

### **Chrome Management (5 tools)**

- `chrome_start` - Launch Chrome with debugging enabled
- `chrome_connect` - Connect to existing Chrome instance
- `chrome_connect_existing` - Connect to existing browser (Chrome/Chromium) and find active tab
- `chrome_navigate` - Navigate to URLs
- `chrome_status` - Get browser connection status
- `chrome_close` - Close browser session

### **Console Tools (3 tools)**

- `console_logs` - Capture JavaScript console output
- `console_execute` - Execute JavaScript in browser context
- `console_clear` - Clear browser console

### **Network Monitoring (2 tools)**

- `network_requests` - Monitor HTTP requests
- `network_response` - Get detailed response data

## 📋 Usage Examples

### Connecting to Your Browser

The devtools server now **automatically starts Chrome with debugging enabled** - no manual setup
required!

```javascript
// Connect to Chrome - automatically starts with debugging if needed
const status = await chrome_connect_existing();
```

**🚀 Always Start with Debugging Mode:**

- Chrome is automatically launched with debugging flags
- No need to manually start Chrome with `--remote-debugging-port=9222`
- Uses dedicated debug user data directory for clean sessions
- Includes helpful debugging flags like `--disable-web-security`

**Manual Chrome debugging (optional):** If you prefer to manually control Chrome:

```bash
# Start Chrome with debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# For other Chromium-based browsers:
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222
```

### Basic Browser Control

```javascript
// Check current browser status
const status = await chrome_status();

// Navigate to a URL
await chrome_navigate({ url: "https://example.com" });

// Connect to existing browser instance
const connection = await chrome_connect_existing();
```

### Console Debugging

```javascript
// Get console logs
const logs = await console_logs({ level: "error", limit: 50 });

// Execute JavaScript
const result = await console_execute({
  code: "document.title",
  awaitPromise: false,
});

// Clear console
await console_clear();
```

### Network Monitoring

```javascript
// Get network requests
const requests = await network_requests({
  filter: { method: "POST" },
  limit: 100,
});

// Get response details
const response = await network_response({
  requestId: "request-123",
});
```

## 🔧 Configuration

The server requires no API keys and runs entirely locally. Chrome must be installed on the system.

**Supported Chrome locations:**

- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Linux**: `/usr/bin/google-chrome` or `/usr/bin/chromium-browser`

## 🎯 Why Streamlined?

This focused version provides the essential debugging tools you need most:

- **Console**: Debug JavaScript errors and execute code
- **Network**: Monitor HTTP requests and responses
- **Browser Control**: Basic Chrome management

Perfect for debugging web applications without the complexity of unused features.

## 🏗️ Architecture

- **TypeScript** - Full type safety with Chrome DevTools Protocol
- **Cross-platform** - macOS, Windows, Linux support
- **Real-time** - WebSocket streaming for live events
- **Dual-mode** - CDP + Puppeteer for enhanced capabilities
- **Error-resilient** - Comprehensive error handling and recovery

## 📚 Resources

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Project Architecture](../../docs/ARCHITECTURE.md)

---

**Total: 10 essential Chrome debugging tools** focused on console and network debugging for
streamlined web development workflows.
