// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Tools
// ============================================================================

import { DevToolsInputSchemas } from "@mcp/schemas";
import {
  createGenericToolHandlers,
  getGenericAvailableTools,
  ToolDefinition,
} from "@mcp/utils";
import type { ChromeDevToolsClient } from "./chrome-client.js";
import * as handlers from "./handlers.js";

// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Tool Definitions
// ============================================================================

const chromeToolDefinitions: Record<
  string,
  ToolDefinition<ChromeDevToolsClient>
> = {
  // Chrome Management Tools
  chrome_start: {
    handler: handlers.handleStartChrome,
    metadata: {
      name: "chrome_start",
      description: "Start Chrome browser with debugging enabled",
      inputSchema: DevToolsInputSchemas.startChrome,
    },
  },
  chrome_connect: {
    handler: handlers.handleConnectToBrowser,
    metadata: {
      name: "chrome_connect",
      description: "Connect to existing Chrome instance",
      inputSchema: DevToolsInputSchemas.connectToBrowser,
    },
  },
  chrome_navigate: {
    handler: handlers.handleNavigateToUrl,
    metadata: {
      name: "chrome_navigate",
      description: "Navigate to a URL",
      inputSchema: DevToolsInputSchemas.navigateToUrl,
    },
  },
  chrome_status: {
    handler: handlers.handleGetBrowserStatus,
    metadata: {
      name: "chrome_status",
      description: "Get browser connection status",
      inputSchema: DevToolsInputSchemas.getBrowserStatus,
    },
  },
  chrome_close: {
    handler: handlers.handleCloseBrowser,
    metadata: {
      name: "chrome_close",
      description: "Close Chrome browser",
      inputSchema: DevToolsInputSchemas.closeBrowser,
    },
  },

  // Console Tools
  console_logs: {
    handler: handlers.handleGetConsoleLogs,
    metadata: {
      name: "console_logs",
      description: "Get JavaScript console logs",
      inputSchema: DevToolsInputSchemas.getConsoleLogs,
    },
  },
  console_execute: {
    handler: handlers.handleExecuteJavaScript,
    metadata: {
      name: "console_execute",
      description: "Execute JavaScript code in browser",
      inputSchema: DevToolsInputSchemas.executeJavaScript,
    },
  },
  console_clear: {
    handler: handlers.handleClearConsole,
    metadata: {
      name: "console_clear",
      description: "Clear browser console",
      inputSchema: DevToolsInputSchemas.clearConsole,
    },
  },

  // Network Tools
  network_requests: {
    handler: handlers.handleGetNetworkRequests,
    metadata: {
      name: "network_requests",
      description: "Get network requests",
      inputSchema: DevToolsInputSchemas.getNetworkRequests,
    },
  },
  network_response: {
    handler: handlers.handleGetNetworkResponse,
    metadata: {
      name: "network_response",
      description: "Get network response details",
      inputSchema: DevToolsInputSchemas.getNetworkResponse,
    },
  },

  // DOM Tools
  dom_document: {
    handler: handlers.handleGetDocument,
    metadata: {
      name: "dom_document",
      description: "Get DOM document structure",
      inputSchema: DevToolsInputSchemas.getDocument,
    },
  },
  dom_query: {
    handler: handlers.handleQuerySelector,
    metadata: {
      name: "dom_query",
      description: "Query DOM elements with CSS selector",
      inputSchema: DevToolsInputSchemas.querySelector,
    },
  },
  dom_attributes: {
    handler: handlers.handleGetElementAttributes,
    metadata: {
      name: "dom_attributes",
      description: "Get element attributes",
      inputSchema: DevToolsInputSchemas.getElementAttributes,
    },
  },
  dom_click: {
    handler: handlers.handleClickElement,
    metadata: {
      name: "dom_click",
      description: "Click DOM element",
      inputSchema: DevToolsInputSchemas.clickElement,
    },
  },

  // Screenshot Tools
  screenshot_page: {
    handler: handlers.handleGetPageScreenshot,
    metadata: {
      name: "screenshot_page",
      description: "Take page screenshot",
      inputSchema: DevToolsInputSchemas.getPageScreenshot,
    },
  },
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createToolHandlers = (chromeClient: ChromeDevToolsClient) =>
  createGenericToolHandlers(chromeToolDefinitions, chromeClient);

export const getAvailableTools = () =>
  getGenericAvailableTools(chromeToolDefinitions);
