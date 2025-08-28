import { DevToolsInputSchemas } from "@mcp/schemas";
import { ToolHandler } from "@mcp/server-core";
import { getGenericAvailableTools, ToolDefinition } from "@mcp/utils";
import * as handlers from "./handlers.js";

const devtoolsToolDefinitions: Record<string, ToolDefinition<null>> = {
  browser_start: {
    handler: handlers.handleStartBrowser,
    metadata: {
      name: "browser_start",
      description:
        "Start browser (Chromium/Firefox/WebKit) with debugging enabled",
      inputSchema: DevToolsInputSchemas.startChrome, // Reuse existing schema
    },
  },

  browser_navigate: {
    handler: handlers.handleNavigateToUrl,
    metadata: {
      name: "browser_navigate",
      description: "Navigate browser to a specific URL",
      inputSchema: DevToolsInputSchemas.navigateToUrl,
    },
  },

  browser_status: {
    handler: handlers.handleGetBrowserStatus,
    metadata: {
      name: "browser_status",
      description: "Get current browser connection status and information",
      inputSchema: DevToolsInputSchemas.getBrowserStatus,
    },
  },

  browser_close: {
    handler: handlers.handleCloseBrowser,
    metadata: {
      name: "browser_close",
      description: "Close browser and cleanup resources",
      inputSchema: DevToolsInputSchemas.closeBrowser,
    },
  },

  browser_screenshot: {
    handler: handlers.handleTakeScreenshot,
    metadata: {
      name: "browser_screenshot",
      description: "Take screenshot of current page",
      inputSchema: DevToolsInputSchemas.getPageScreenshot,
    },
  },

  console_logs: {
    handler: handlers.handleGetConsoleLogs,
    metadata: {
      name: "console_logs",
      description: "Get browser console logs with filtering options",
      inputSchema: DevToolsInputSchemas.getConsoleLogs,
    },
  },

  console_execute: {
    handler: handlers.handleExecuteJavaScript,
    metadata: {
      name: "console_execute",
      description: "Execute JavaScript code in the browser context",
      inputSchema: DevToolsInputSchemas.executeJavaScript,
    },
  },

  network_requests: {
    handler: handlers.handleGetNetworkRequests,
    metadata: {
      name: "network_requests",
      description: "Get network requests with filtering and pagination",
      inputSchema: DevToolsInputSchemas.getNetworkRequests,
    },
  },

  network_response: {
    handler: handlers.handleGetNetworkResponses,
    metadata: {
      name: "network_response",
      description: "Get network response details",
      inputSchema: DevToolsInputSchemas.getNetworkResponse,
    },
  },

  dom_click: {
    handler: handlers.handleClickElement,
    metadata: {
      name: "dom_click",
      description: "Click on page element using node ID",
      inputSchema: DevToolsInputSchemas.clickElement,
    },
  },
};

export function createToolHandlers(): Record<string, ToolHandler> {
  return {
    browser_start: handlers.handleStartBrowser,
    browser_navigate: handlers.handleNavigateToUrl,
    browser_status: handlers.handleGetBrowserStatus,
    browser_close: handlers.handleCloseBrowser,
    browser_screenshot: handlers.handleTakeScreenshot,
    console_logs: handlers.handleGetConsoleLogs,
    console_execute: handlers.handleExecuteJavaScript,
    network_requests: handlers.handleGetNetworkRequests,
    network_response: handlers.handleGetNetworkResponses,
    dom_click: handlers.handleClickElement,
  };
}

export const getAvailableTools = () =>
  getGenericAvailableTools(devtoolsToolDefinitions);
