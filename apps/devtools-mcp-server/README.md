# Chrome DevTools MCP Server

A comprehensive Model Context Protocol (MCP) server providing Chrome browser automation and
debugging capabilities. Control Chrome programmatically through the Chrome DevTools Protocol (CDP).

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

### **DOM Manipulation (9 tools)**

- `dom_document` - Get full DOM structure
- `dom_query` - Query elements with CSS selectors
- `dom_attributes` - Get/inspect element attributes
- `dom_click` - Click elements programmatically
- `dom_set_text` - Modify element text content
- `dom_set_attribute` - Set element attributes
- `dom_remove` - Remove DOM elements
- `dom_get_styles` - Get element inline styles
- `dom_set_style` - Set element inline styles

### **CSS Inspection (2 tools)**

- `css_computed_styles` - Get computed CSS styles
- `css_rules` - Get CSS rules for elements

### **Storage Tools (3 tools)**

- `storage_local` - Access localStorage data
- `storage_session` - Access sessionStorage data
- `storage_cookies` - Get browser cookies

### **Debugging Tools (9 tools)**

- `debug_set_breakpoint` - Set JavaScript breakpoints
- `debug_remove_breakpoint` - Remove breakpoints
- `debug_evaluate` - Evaluate expressions in debug context
- `debug_call_stack` - Get current call stack
- `debug_step_over` - Step over in debugger
- `debug_step_into` - Step into functions
- `debug_step_out` - Step out of functions
- `debug_resume` - Resume execution
- `debug_pause` - Pause execution

### **Error Handling (6 tools)**

- `error_runtime` - Get JavaScript runtime errors
- `error_network` - Get network request errors
- `error_console` - Get console errors and warnings
- `error_clear` - Clear stored errors
- `error_listener` - Enable/disable error tracking
- `error_summary` - Get error statistics

### **Screenshot (1 tool)**

- `screenshot_page` - Capture page screenshots

## 📋 Usage Examples

### Basic Browser Control

```javascript
// Start Chrome and navigate
await chrome_start({ headless: false, autoConnect: true });
await chrome_navigate({ url: "https://example.com" });

// Get page status
const status = await chrome_status();
```

### DOM Manipulation

```javascript
// Find and click a button
const button = await dom_query({ selector: "button.submit" });
await dom_click({ nodeId: button.nodeId });

// Modify page content
await dom_set_text({ nodeId: titleNode.nodeId, text: "New Title" });
```

### Debugging

```javascript
// Set breakpoint and evaluate
await debug_set_breakpoint({ url: "app.js", lineNumber: 42 });
await debug_evaluate({ expression: "user.name" });
```

## 🔧 Configuration

The server requires no API keys and runs entirely locally. Chrome must be installed on the system.

**Supported Chrome locations:**

- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Linux**: `/usr/bin/google-chrome` or `/usr/bin/chromium-browser`

## 🎯 Future Expansion

### **High Priority**

- [ ] **Performance Domain** - CPU/memory profiling, performance metrics
- [ ] **Input Domain** - Mouse/keyboard automation, touch events
- [ ] **Emulation Domain** - Device simulation, mobile testing
- [ ] **Layer Tree** - Rendering layer inspection
- [ ] **Security Domain** - Security state analysis

### **Medium Priority**

- [ ] **Service Worker** - Service worker debugging
- [ ] **Storage Domain** - IndexedDB, WebSQL inspection
- [ ] **Media Domain** - Audio/video element debugging
- [ ] **WebAudio Domain** - Web Audio API inspection
- [ ] **Animation Domain** - CSS animation control

### **Advanced Features**

- [ ] **Tracing Domain** - Chrome performance tracing
- [ ] **Profiler Domain** - Advanced CPU profiling
- [ ] **HeapProfiler** - Memory leak detection
- [ ] **Target Management** - Multi-tab/iframe control
- [ ] **Overlay Domain** - Visual debugging overlays

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

**Total: 40 Chrome automation tools** across 8 domains, ready for professional browser testing and
debugging workflows.
