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
  chrome_connect_existing: {
    handler: handlers.handleConnectToExistingBrowser,
    metadata: {
      name: "chrome_connect_existing",
      description:
        "Connect to existing browser instance (Chrome/Chromium) and find active tab",
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
  network_set_domain_filter: {
    handler: handlers.handleSetNetworkDomainFilter,
    metadata: {
      name: "network_set_domain_filter",
      description:
        "Set a domain to filter network requests by. Clears filter if no domain is provided.",
      inputSchema: DevToolsInputSchemas.setNetworkDomainFilter,
    },
  },
  network_clear_domain_filter: {
    handler: handlers.handleClearNetworkDomainFilter,
    metadata: {
      name: "network_clear_domain_filter",
      description: "Clear the network domain filter.",
      inputSchema: DevToolsInputSchemas.clearNetworkDomainFilter,
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
};

// ============================================================================
// EXPORTED REGISTRY FUNCTIONS - Using Generic Implementations
// ============================================================================

export const createToolHandlers = (chromeClient?: ChromeDevToolsClient) => {
  if (!chromeClient) {
    throw new Error("ChromeDevToolsClient is required for devtools server");
  }
  return createGenericToolHandlers(chromeToolDefinitions, chromeClient);
};

export const getAvailableTools = () =>
  getGenericAvailableTools(chromeToolDefinitions);
