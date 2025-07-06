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

  // CSS Tools
  css_computed_styles: {
    handler: handlers.handleGetComputedStyles,
    metadata: {
      name: "css_computed_styles",
      description: "Get computed CSS styles for element",
      inputSchema: DevToolsInputSchemas.getComputedStyles,
    },
  },
  css_rules: {
    handler: handlers.handleGetCSSRules,
    metadata: {
      name: "css_rules",
      description: "Get CSS rules for element",
      inputSchema: DevToolsInputSchemas.getCSSRules,
    },
  },

  // Storage Tools
  storage_local: {
    handler: handlers.handleGetLocalStorage,
    metadata: {
      name: "storage_local",
      description: "Get localStorage data",
      inputSchema: DevToolsInputSchemas.getLocalStorage,
    },
  },
  storage_session: {
    handler: handlers.handleGetSessionStorage,
    metadata: {
      name: "storage_session",
      description: "Get sessionStorage data",
      inputSchema: DevToolsInputSchemas.getSessionStorage,
    },
  },
  storage_cookies: {
    handler: handlers.handleGetCookies,
    metadata: {
      name: "storage_cookies",
      description: "Get browser cookies",
      inputSchema: DevToolsInputSchemas.getCookies,
    },
  },

  // Advanced DOM Tools
  dom_set_text: {
    handler: handlers.handleSetElementText,
    metadata: {
      name: "dom_set_text",
      description: "Set text content of DOM element",
      inputSchema: DevToolsInputSchemas.setElementText,
    },
  },
  dom_set_attribute: {
    handler: handlers.handleSetElementAttribute,
    metadata: {
      name: "dom_set_attribute",
      description: "Set attribute of DOM element",
      inputSchema: DevToolsInputSchemas.setElementAttribute,
    },
  },
  dom_remove: {
    handler: handlers.handleRemoveElement,
    metadata: {
      name: "dom_remove",
      description: "Remove DOM element",
      inputSchema: DevToolsInputSchemas.removeElement,
    },
  },
  dom_get_styles: {
    handler: handlers.handleGetElementStyles,
    metadata: {
      name: "dom_get_styles",
      description: "Get inline styles of DOM element",
      inputSchema: DevToolsInputSchemas.getElementStyles,
    },
  },
  dom_set_style: {
    handler: handlers.handleSetElementStyle,
    metadata: {
      name: "dom_set_style",
      description: "Set inline style of DOM element",
      inputSchema: DevToolsInputSchemas.setElementStyle,
    },
  },

  // Debugging Tools
  debug_set_breakpoint: {
    handler: handlers.handleSetBreakpoint,
    metadata: {
      name: "debug_set_breakpoint",
      description: "Set JavaScript breakpoint",
      inputSchema: DevToolsInputSchemas.setBreakpoint,
    },
  },
  debug_remove_breakpoint: {
    handler: handlers.handleRemoveBreakpoint,
    metadata: {
      name: "debug_remove_breakpoint",
      description: "Remove JavaScript breakpoint",
      inputSchema: DevToolsInputSchemas.removeBreakpoint,
    },
  },
  debug_evaluate: {
    handler: handlers.handleEvaluateExpression,
    metadata: {
      name: "debug_evaluate",
      description: "Evaluate JavaScript expression in debug context",
      inputSchema: DevToolsInputSchemas.evaluateExpression,
    },
  },
  debug_call_stack: {
    handler: handlers.handleGetCallStack,
    metadata: {
      name: "debug_call_stack",
      description: "Get JavaScript call stack",
      inputSchema: DevToolsInputSchemas.getCallStack,
    },
  },
  debug_step_over: {
    handler: handlers.handleStepOver,
    metadata: {
      name: "debug_step_over",
      description: "Step over in debugger",
      inputSchema: DevToolsInputSchemas.stepOver,
    },
  },
  debug_step_into: {
    handler: handlers.handleStepInto,
    metadata: {
      name: "debug_step_into",
      description: "Step into in debugger",
      inputSchema: DevToolsInputSchemas.stepInto,
    },
  },
  debug_step_out: {
    handler: handlers.handleStepOut,
    metadata: {
      name: "debug_step_out",
      description: "Step out in debugger",
      inputSchema: DevToolsInputSchemas.stepOut,
    },
  },
  debug_resume: {
    handler: handlers.handleResumeExecution,
    metadata: {
      name: "debug_resume",
      description: "Resume JavaScript execution",
      inputSchema: DevToolsInputSchemas.resumeExecution,
    },
  },
  debug_pause: {
    handler: handlers.handlePauseExecution,
    metadata: {
      name: "debug_pause",
      description: "Pause JavaScript execution",
      inputSchema: DevToolsInputSchemas.pauseExecution,
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
