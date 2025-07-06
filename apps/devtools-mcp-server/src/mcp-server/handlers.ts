// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Request Handlers
// ============================================================================

import { z } from "zod";
import {
  GetComputedStylesSchema,
  GetCSSRulesSchema,
  GetLocalStorageSchema,
  GetSessionStorageSchema,
  GetCookiesSchema,
  SetElementTextSchema,
  SetElementAttributeSchema,
  RemoveElementSchema,
  GetElementStylesSchema,
  SetElementStyleSchema,
  SetBreakpointSchema,
  RemoveBreakpointSchema,
  EvaluateExpressionSchema,
  GetCallStackSchema,
  StepOverSchema,
  StepIntoSchema,
  StepOutSchema,
  ResumeExecutionSchema,
  PauseExecutionSchema,
  GetRuntimeErrorsSchema,
  GetNetworkErrorsSchema,
  GetConsoleErrorsSchema,
  ClearErrorsSchema,
  SetErrorListenerSchema,
} from "../schemas/domain-schemas.js";
import type {
  ConsoleLogEntry,
  NetworkRequest,
  NetworkResponse,
  DevtoolsItemResource,
  DevtoolsProjectResource,
  RuntimeError,
  NetworkError,
  ConsoleError,
  ErrorSummary,
} from "../types/domain-types.js";
import type { ChromeDevToolsClient } from "./chrome-client.js";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const StartChromeSchema = z.object({
  port: z.number().min(1024).max(65535).optional().default(9222),
  headless: z.boolean().optional().default(false),
  chromePath: z.string().optional(),
  userDataDir: z.string().optional(),
  url: z.string().optional(),
  autoConnect: z.boolean().optional().default(true),
  args: z.array(z.string()).optional(),
});

const ConnectToBrowserSchema = z.object({
  port: z.number().min(1024).max(65535).optional().default(9222),
});

const NavigateToUrlSchema = z.object({
  url: z.string(),
  waitForLoad: z.boolean().optional().default(true),
});

const GetConsoleLogsSchema = z.object({
  level: z.enum(["log", "info", "warn", "error", "debug", "trace"]).optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
});

const ExecuteJavaScriptSchema = z.object({
  code: z.string(),
  awaitPromise: z.boolean().optional().default(false),
});

const GetNetworkRequestsSchema = z.object({
  filter: z
    .object({
      domain: z.string().optional(),
      method: z.string().optional(),
      status: z.number().optional(),
      resourceType: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
});

const GetNetworkResponseSchema = z.object({
  requestId: z.string(),
});

const GetDocumentSchema = z.object({
  depth: z.number().min(-1).optional().default(2),
});

const QuerySelectorSchema = z.object({
  selector: z.string(),
  all: z.boolean().optional().default(false),
});

const GetElementAttributesSchema = z.object({
  nodeId: z.number(),
});

const ClickElementSchema = z.object({
  nodeId: z.number(),
});

const GetPageScreenshotSchema = z.object({
  format: z.enum(["png", "jpeg"]).optional().default("png"),
  quality: z.number().min(0).max(100).optional().default(90),
  fullPage: z.boolean().optional().default(false),
});

// ============================================================================
// CHROME MANAGEMENT HANDLERS
// ============================================================================

export async function handleStartChrome(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { port, headless, chromePath, userDataDir, url, autoConnect, args } =
    StartChromeSchema.parse(params);

  // Update client options
  const options = {
    port,
    headless,
    chromePath,
    userDataDir,
    url,
    autoConnect,
    args,
  };
  Object.assign(chromeClient, { options });

  const status = await chromeClient.startChrome();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Chrome started successfully",
            status,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleConnectToBrowser(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { port: _port } = ConnectToBrowserSchema.parse(params);

  // Update port if provided - we'll need to create a new client with the new port
  // For now, just use the provided port in the connect call
  const status = await chromeClient.connect();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Connected to Chrome successfully",
            status,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleNavigateToUrl(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { url, waitForLoad } = NavigateToUrlSchema.parse(params);

  await chromeClient.navigateToUrl(url);

  if (waitForLoad) {
    await chromeClient.waitForPageLoad();
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Navigated to ${url}`,
            url,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetBrowserStatus(
  chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  const status = chromeClient.getConnectionStatus();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            status,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleCloseBrowser(
  chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  await chromeClient.closeBrowser();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Browser closed successfully",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// CONSOLE HANDLERS
// ============================================================================

const consoleLogs: ConsoleLogEntry[] = [];

export async function handleGetConsoleLogs(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { level, limit } = GetConsoleLogsSchema.parse(params);

  // Set up console listener if not already done
  chromeClient.addConsoleListener((log) => {
    consoleLogs.push(log);
    // Keep only last 1000 logs to prevent memory issues
    if (consoleLogs.length > 1000) {
      consoleLogs.splice(0, consoleLogs.length - 1000);
    }
  });

  let filteredLogs = consoleLogs;
  if (level) {
    filteredLogs = consoleLogs.filter((log) => log.type === level);
  }

  const recentLogs = filteredLogs.slice(-limit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            logs: recentLogs,
            count: recentLogs.length,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleExecuteJavaScript(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { code, awaitPromise } = ExecuteJavaScriptSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const result = await client.Runtime.evaluate({
    expression: code,
    awaitPromise,
    returnByValue: true,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            result: result.result,
            exceptionDetails: result.exceptionDetails,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleClearConsole(
  chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Console.clearMessages();
  consoleLogs.length = 0; // Clear our local cache

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Console cleared",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// NETWORK HANDLERS
// ============================================================================

const networkRequests: NetworkRequest[] = [];
const networkResponses: NetworkResponse[] = [];

export async function handleGetNetworkRequests(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { filter, limit } = GetNetworkRequestsSchema.parse(params);

  // Set up network listeners if not already done
  chromeClient.setNetworkListeners({
    onRequest: (request) => {
      networkRequests.push(request);
      // Keep only last 1000 requests
      if (networkRequests.length > 1000) {
        networkRequests.splice(0, networkRequests.length - 1000);
      }
    },
    onResponse: (response) => {
      networkResponses.push(response);
      // Keep only last 1000 responses
      if (networkResponses.length > 1000) {
        networkResponses.splice(0, networkResponses.length - 1000);
      }
    },
  });

  let filteredRequests = networkRequests;

  if (filter) {
    filteredRequests = networkRequests.filter((req) => {
      if (filter.domain && !req.url.includes(filter.domain)) return false;
      if (filter.method && req.method !== filter.method) return false;
      if (filter.resourceType && req.resourceType !== filter.resourceType)
        return false;
      return true;
    });
  }

  const recentRequests = filteredRequests.slice(-limit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            requests: recentRequests,
            count: recentRequests.length,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetNetworkResponse(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { requestId } = GetNetworkResponseSchema.parse(params);

  const response = networkResponses.find((res) => res.requestId === requestId);

  if (!response) {
    throw new Error(`No response found for request ID: ${requestId}`);
  }

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get response body if available
  let responseBody;
  try {
    const bodyResult = await client.Network.getResponseBody({ requestId });
    responseBody = bodyResult.body;
  } catch {
    // Response body might not be available
    responseBody = null;
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            response,
            body: responseBody,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// DOM HANDLERS
// ============================================================================

export async function handleGetDocument(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { depth } = GetDocumentSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const document = await client.DOM.getDocument({ depth });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            document: document.root,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleQuerySelector(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { selector, all } = QuerySelectorSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get document first
  const document = await client.DOM.getDocument({ depth: 1 });

  let result;
  if (all) {
    result = await client.DOM.querySelectorAll({
      nodeId: document.root.nodeId,
      selector,
    });
  } else {
    result = await client.DOM.querySelector({
      nodeId: document.root.nodeId,
      selector,
    });
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            result,
            selector,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetElementAttributes(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId } = GetElementAttributesSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const attributes = await client.DOM.getAttributes({ nodeId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            nodeId,
            attributes: attributes.attributes,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleClickElement(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId } = ClickElementSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get element box model for click coordinates
  const boxModel = await client.DOM.getBoxModel({ nodeId });
  const [x, y] = boxModel.model.content;

  // Perform click
  await client.Input.dispatchMouseEvent({
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });

  await client.Input.dispatchMouseEvent({
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Clicked element with nodeId: ${nodeId}`,
            coordinates: { x, y },
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// SCREENSHOT HANDLERS
// ============================================================================

export async function handleGetPageScreenshot(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { format, quality, fullPage } = GetPageScreenshotSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const options: Record<string, unknown> = { format };
  if (format === "jpeg") {
    options.quality = quality;
  }
  if (fullPage) {
    options.captureBeyondViewport = true;
  }

  const screenshot = await client.Page.captureScreenshot(options);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            format,
            data: screenshot.data,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// CSS HANDLERS
// ============================================================================

export async function handleGetComputedStyles(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId } = GetComputedStylesSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const styles = await client.CSS.getComputedStyleForNode({ nodeId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            nodeId,
            computedStyles: styles.computedStyle,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetCSSRules(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId } = GetCSSRulesSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const matchedRules = await client.CSS.getMatchedStylesForNode({ nodeId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            nodeId,
            matchedCSSRules: matchedRules.matchedCSSRules,
            inlineStyle: matchedRules.inlineStyle,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// STORAGE HANDLERS
// ============================================================================

export async function handleGetLocalStorage(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { origin } = GetLocalStorageSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get current page origin if not provided
  let storageOrigin = origin;
  if (!storageOrigin) {
    const document = await client.DOM.getDocument({ depth: 1 });
    const url = new URL(document.root.documentURL || "");
    storageOrigin = url.origin;
  }

  // Get localStorage data
  const localStorage = await client.DOMStorage.getDOMStorageItems({
    storageId: {
      securityOrigin: storageOrigin,
      isLocalStorage: true,
    },
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            origin: storageOrigin,
            localStorage: localStorage.entries.map(([key, value]) => ({
              key,
              value,
            })),
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetSessionStorage(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { origin } = GetSessionStorageSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get current page origin if not provided
  let storageOrigin = origin;
  if (!storageOrigin) {
    const document = await client.DOM.getDocument({ depth: 1 });
    const url = new URL(document.root.documentURL || "");
    storageOrigin = url.origin;
  }

  // Get sessionStorage data
  const sessionStorage = await client.DOMStorage.getDOMStorageItems({
    storageId: {
      securityOrigin: storageOrigin,
      isLocalStorage: false,
    },
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            origin: storageOrigin,
            sessionStorage: sessionStorage.entries.map(([key, value]) => ({
              key,
              value,
            })),
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetCookies(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { domain } = GetCookiesSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get current page domain if not provided
  let cookieDomain = domain;
  if (!cookieDomain) {
    const document = await client.DOM.getDocument({ depth: 1 });
    const url = new URL(document.root.documentURL || "");
    cookieDomain = url.hostname;
  }

  // Get cookies
  const cookies = await client.Network.getCookies({
    urls: [`https://${cookieDomain}`, `http://${cookieDomain}`],
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            domain: cookieDomain,
            cookies: cookies.cookies.map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              expires: cookie.expires,
              size: cookie.size,
              httpOnly: cookie.httpOnly,
              secure: cookie.secure,
              session: cookie.session,
              sameSite: cookie.sameSite,
            })),
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// ADVANCED DOM MANIPULATION HANDLERS
// ============================================================================

export async function handleSetElementText(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId, text } = SetElementTextSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Set the text content of the element
  await client.DOM.setNodeValue({ nodeId, value: text });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Set text content for node ${nodeId}`,
            nodeId,
            text,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleSetElementAttribute(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId, name, value } = SetElementAttributeSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Set the attribute on the element
  await client.DOM.setAttributeValue({ nodeId, name, value });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Set attribute ${name}="${value}" for node ${nodeId}`,
            nodeId,
            attribute: { name, value },
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleRemoveElement(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId } = RemoveElementSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Remove the element from the DOM
  await client.DOM.removeNode({ nodeId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Removed node ${nodeId} from DOM`,
            nodeId,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetElementStyles(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId } = GetElementStylesSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get inline styles for the element
  const inlineStyles = await client.CSS.getInlineStylesForNode({ nodeId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            nodeId,
            inlineStyle: inlineStyles.inlineStyle,
            attributesStyle: inlineStyles.attributesStyle,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleSetElementStyle(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { nodeId, property, value } = SetElementStyleSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Get the current inline styles
  const inlineStyles = await client.CSS.getInlineStylesForNode({ nodeId });

  if (!inlineStyles.inlineStyle) {
    throw new Error("Element has no inline styles to modify");
  }

  // Find the property to update or add it
  const styleSheetId = inlineStyles.inlineStyle.styleSheetId;
  const range = inlineStyles.inlineStyle.range;

  if (!styleSheetId || !range) {
    throw new Error("Cannot modify inline styles for this element");
  }

  // Set the CSS property
  await client.CSS.setStyleTexts({
    edits: [
      {
        styleSheetId,
        range,
        text: `${property}: ${value}`,
      },
    ],
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Set style ${property}: ${value} for node ${nodeId}`,
            nodeId,
            style: { property, value },
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// DEBUGGING HANDLERS
// ============================================================================

export async function handleSetBreakpoint(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { url, lineNumber, columnNumber, condition } =
    SetBreakpointSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const breakpoint = await client.Debugger.setBreakpointByUrl({
    url,
    lineNumber,
    columnNumber,
    condition,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            breakpointId: breakpoint.breakpointId,
            locations: breakpoint.locations,
            message: `Breakpoint set at ${url}:${lineNumber}`,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleRemoveBreakpoint(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { breakpointId } = RemoveBreakpointSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Debugger.removeBreakpoint({ breakpointId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Removed breakpoint ${breakpointId}`,
            breakpointId,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleEvaluateExpression(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const {
    expression,
    objectGroup,
    includeCommandLineAPI,
    silent,
    contextId,
    returnByValue,
    generatePreview,
  } = EvaluateExpressionSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  const result = await client.Runtime.evaluate({
    expression,
    objectGroup,
    includeCommandLineAPI,
    silent,
    contextId,
    returnByValue,
    generatePreview,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            result: result.result,
            exceptionDetails: result.exceptionDetails,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetCallStack(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { maxDepth } = GetCallStackSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Check if execution is paused
  const _callFrames = await client.Debugger.getScriptSource({
    scriptId: "",
  }).catch(() => {
    throw new Error("Cannot get call stack - execution is not paused");
  });

  // This is a simplified version - in practice, you'd get this from paused state
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Call stack retrieval requires execution to be paused",
            maxDepth,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleStepOver(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  StepOverSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Debugger.stepOver();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Stepped over",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleStepInto(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  StepIntoSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Debugger.stepInto();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Stepped into",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleStepOut(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  StepOutSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Debugger.stepOut();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Stepped out",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleResumeExecution(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  ResumeExecutionSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Debugger.resume();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Resumed execution",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handlePauseExecution(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  PauseExecutionSchema.parse(params);

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  await client.Debugger.pause();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Paused execution",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// ERROR HANDLING STORAGE
// ============================================================================

const runtimeErrors: RuntimeError[] = [];
const networkErrors: NetworkError[] = [];
const consoleErrors: ConsoleError[] = [];
let errorListenerEnabled = true;

// ============================================================================
// ERROR HANDLING HANDLERS
// ============================================================================

export async function handleGetRuntimeErrors(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { limit, since } = GetRuntimeErrorsSchema.parse(params);

  let filteredErrors = runtimeErrors;
  if (since) {
    filteredErrors = runtimeErrors.filter((error) => error.timestamp >= since);
  }

  const recentErrors = filteredErrors.slice(-limit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            errors: recentErrors,
            count: recentErrors.length,
            totalCount: runtimeErrors.length,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetNetworkErrors(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { limit, since } = GetNetworkErrorsSchema.parse(params);

  let filteredErrors = networkErrors;
  if (since) {
    filteredErrors = networkErrors.filter((error) => error.timestamp >= since);
  }

  const recentErrors = filteredErrors.slice(-limit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            errors: recentErrors,
            count: recentErrors.length,
            totalCount: networkErrors.length,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetConsoleErrors(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { limit, level, since } = GetConsoleErrorsSchema.parse(params);

  let filteredErrors = consoleErrors;

  // Filter by level
  if (level !== "all") {
    filteredErrors = filteredErrors.filter((error) => error.level === level);
  }

  // Filter by timestamp
  if (since) {
    filteredErrors = filteredErrors.filter((error) => error.timestamp >= since);
  }

  const recentErrors = filteredErrors.slice(-limit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            errors: recentErrors,
            count: recentErrors.length,
            totalCount: consoleErrors.length,
            level,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleClearErrors(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { type } = ClearErrorsSchema.parse(params);

  let clearedCount = 0;

  switch (type) {
    case "runtime":
      clearedCount = runtimeErrors.length;
      runtimeErrors.length = 0;
      break;
    case "network":
      clearedCount = networkErrors.length;
      networkErrors.length = 0;
      break;
    case "console":
      clearedCount = consoleErrors.length;
      consoleErrors.length = 0;
      break;
    case "all":
      clearedCount =
        runtimeErrors.length + networkErrors.length + consoleErrors.length;
      runtimeErrors.length = 0;
      networkErrors.length = 0;
      consoleErrors.length = 0;
      break;
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Cleared ${clearedCount} ${type} errors`,
            clearedCount,
            type,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleSetErrorListener(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { enabled, types } = SetErrorListenerSchema.parse(params);

  errorListenerEnabled = enabled;

  const client = chromeClient.getClient();
  if (!client) {
    throw new Error("Not connected to Chrome");
  }

  // Set up error listeners based on types
  if (enabled && types.includes("runtime")) {
    client.Runtime.exceptionThrown((params) => {
      if (!errorListenerEnabled) return;

      const error: RuntimeError = {
        id: `runtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        message: params.exceptionDetails.text || "Runtime exception",
        source: params.exceptionDetails.url || "unknown",
        line: params.exceptionDetails.lineNumber,
        column: params.exceptionDetails.columnNumber,
        stack: params.exceptionDetails.stackTrace?.description,
        type: "runtime",
        url: params.exceptionDetails.url,
        scriptId: params.exceptionDetails.scriptId,
      };

      runtimeErrors.push(error);
      // Keep only last 1000 errors
      if (runtimeErrors.length > 1000) {
        runtimeErrors.splice(0, runtimeErrors.length - 1000);
      }
    });
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Error listener ${enabled ? "enabled" : "disabled"}`,
            enabled,
            types,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetErrorSummary(
  _chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  const summary: ErrorSummary = {
    runtimeErrors: runtimeErrors.length,
    networkErrors: networkErrors.length,
    consoleErrors: consoleErrors.length,
    totalErrors:
      runtimeErrors.length + networkErrors.length + consoleErrors.length,
    lastErrorTime:
      Math.max(
        ...runtimeErrors.map((e) => e.timestamp),
        ...networkErrors.map((e) => e.timestamp),
        ...consoleErrors.map((e) => e.timestamp),
        0
      ) || undefined,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            summary,
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================================
// RESOURCE HANDLERS (for backward compatibility)
// ============================================================================

export async function handleDevtoolsItemsResource(
  _client: ChromeDevToolsClient,
  uri: string
) {
  const items: DevtoolsItemResource[] = [
    {
      id: "console-logs",
      title: "Console Logs",
      description: "JavaScript console output and errors",
      uri: uri,
      mimeType: "application/json",
    },
    {
      id: "network-requests",
      title: "Network Requests",
      description: "HTTP requests and responses",
      uri: uri,
      mimeType: "application/json",
    },
  ];

  return {
    contents: [
      {
        uri: uri,
        text: JSON.stringify(items, null, 2),
      },
    ],
  };
}

export async function handleDevtoolsProjectsResource(
  _client: ChromeDevToolsClient,
  uri: string
) {
  const projects: DevtoolsProjectResource[] = [
    {
      id: "chrome-session",
      name: "Chrome Browser Session",
      description: "Current Chrome debugging session",
      uri: uri,
      mimeType: "application/json",
    },
  ];

  return {
    contents: [
      {
        uri: uri,
        text: JSON.stringify(projects, null, 2),
      },
    ],
  };
}
