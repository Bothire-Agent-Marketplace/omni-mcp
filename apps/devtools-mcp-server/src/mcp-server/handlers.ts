// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Request Handlers
// ============================================================================

import {
  StartChromeSchema,
  ConnectToBrowserSchema,
  NavigateToUrlSchema,
  GetBrowserStatusSchema,
  CloseBrowserSchema,
  GetConsoleLogsSchema,
  ExecuteJavaScriptSchema,
  ClearConsoleSchema,
  GetNetworkRequestsSchema,
  GetNetworkResponseSchema,
} from "../schemas/domain-schemas.js";
import type {
  ConsoleLogEntry,
  NetworkRequest,
  NetworkResponse,
  DevtoolsItemResource,
  DevtoolsProjectResource,
} from "../types/domain-types.js";
import type { ChromeDevToolsClient } from "./chrome-client.js";

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

export async function handleConnectToExistingBrowser(
  chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  const status = await chromeClient.connectToExistingBrowser();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Connected to existing browser successfully",
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
  params: unknown
) {
  GetBrowserStatusSchema.parse(params);
  const status = chromeClient.getConnectionStatus();
  const browserInfo = chromeClient.getBrowserInfo();
  const availableBrowsers = chromeClient.getAvailableBrowsers();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            status,
            browser: {
              name: browserInfo.name,
              type: browserInfo.type,
              executablePath: browserInfo.executablePath,
              description: browserInfo.description,
            },
            availableBrowsers: availableBrowsers.map((b) => ({
              name: b.name,
              type: b.type,
              description: b.description,
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

export async function handleCloseBrowser(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  CloseBrowserSchema.parse(params);
  await chromeClient.closeBrowserEnhanced();

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
  params: unknown
) {
  ClearConsoleSchema.parse(params);
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

// Blocklist of tracking/marketing domains to filter out
const TRACKING_DOMAINS_BLOCKLIST = [
  "bat.bing.com",
  "api.hubspot.com",
  "track.hubspot.com",
  "cta-service-cms2.hubspot.com",
  "forms.hubspot.com",
  "js.hsleadflows.net",
  "js.usemessages.com",
  "connect.facebook.net",
  "www.facebook.com",
  "analytics.google.com",
  "googleads.g.doubleclick.net",
  "td.doubleclick.net",
  "www.google.com",
  "www.google.ca",
  "www.googletagmanager.com",
  "px4.ads.linkedin.com",
  "static.cloudflareinsights.com",
  "cdn.intake-lr.com", // LogRocket tracking
  "r.intake-lr.com", // LogRocket tracking endpoint
];

export async function handleSetNetworkDomainFilter(
  chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  const { domain } = _params as { domain: string };
  chromeClient.setDomainFilter(domain);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: `Network domain filter set to: ${domain}`,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleClearNetworkDomainFilter(
  chromeClient: ChromeDevToolsClient,
  _params: unknown
) {
  // No need to parse params for this function
  chromeClient.setDomainFilter(null);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Network domain filter cleared",
            timestamp: Date.now(),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleGetNetworkRequests(
  chromeClient: ChromeDevToolsClient,
  params: unknown
) {
  const { filter, limit } = GetNetworkRequestsSchema.parse(params);
  const forcedDomain = chromeClient.getDomainFilter();

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
  const domainToFilter = forcedDomain || filter?.domain;

  // Apply filters
  filteredRequests = networkRequests.filter((req) => {
    // First check blocklist - exclude tracking/marketing domains
    const requestUrl = new URL(req.url);
    if (TRACKING_DOMAINS_BLOCKLIST.includes(requestUrl.hostname)) {
      return false;
    }

    // Then apply other filters
    if (domainToFilter && !req.url.includes(domainToFilter)) return false;
    if (filter?.method && req.method !== filter.method) return false;
    if (filter?.resourceType && req.resourceType !== filter.resourceType)
      return false;
    return true;
  });

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
