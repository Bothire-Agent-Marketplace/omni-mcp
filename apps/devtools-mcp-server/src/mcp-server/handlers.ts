import { z } from "zod";
import { PlaywrightClient } from "./client.js";

const NavigateSchema = z.object({
  url: z.url(),
  waitUntil: z.enum(["domcontentloaded", "load", "networkidle"]).optional(),
  timeout: z.number().optional(),
});

const ScreenshotSchema = z.object({
  fullPage: z.boolean().optional(),
  clip: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  type: z.enum(["png", "jpeg"]).optional(),
  quality: z.number().min(0).max(100).optional(),
});

const ExecuteJSSchema = z.object({
  code: z.string(),
});

const NetworkFilterSchema = z.object({
  domain: z.string().optional(),
  method: z.string().optional(),
  resourceType: z.string().optional(),
  status: z.number().optional(),
  limit: z.number().min(1).max(1000).optional().default(50),
});

const ConsoleFilterSchema = z.object({
  level: z.enum(["log", "error", "warn", "info", "debug", "trace"]).optional(),
  limit: z.number().min(1).max(1000).optional().default(50),
});

let globalClient: PlaywrightClient | null = null;

export async function handleStartBrowser(params: unknown = {}) {
  const options = z
    .object({
      browserType: z
        .enum(["chromium", "firefox", "webkit"])
        .optional()
        .default("chromium"),
      headless: z.boolean().optional().default(false),
      devtools: z.boolean().optional().default(true),
    })
    .parse(params);

  try {
    if (globalClient && globalClient.isConnected()) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                status: "already_connected",
                message: "Browser already running",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    globalClient = new PlaywrightClient(options);
    await globalClient.start();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              status: "connected",
              browserType: options.browserType,
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleNavigateToUrl(params: unknown) {
  const { url, waitUntil, timeout } = NavigateSchema.parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    await globalClient.navigateToUrl(url, { waitUntil, timeout });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              url,
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              url,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleTakeScreenshot(params: unknown = {}) {
  const options = ScreenshotSchema.parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    const screenshot = await globalClient.takeScreenshot(options);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              screenshot: screenshot.toString("base64"),
              format: options.type || "png",
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleExecuteJavaScript(params: unknown) {
  const { code } = ExecuteJSSchema.parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    const result = await globalClient.executeJavaScript(code);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              result,
              code,
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              code,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleGetNetworkRequests(params: unknown = {}) {
  const filter = NetworkFilterSchema.parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    const requests = globalClient.getNetworkRequests({
      domain: filter.domain,
      method: filter.method,
      resourceType: filter.resourceType,
    });

    const limitedRequests = requests.slice(0, filter.limit);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              requests: limitedRequests,
              count: limitedRequests.length,
              totalCount: requests.length,
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleGetNetworkResponses(params: unknown = {}) {
  const filter = NetworkFilterSchema.parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    const responses = globalClient.getNetworkResponses({
      domain: filter.domain,
      status: filter.status,
    });

    const limitedResponses = responses.slice(0, filter.limit);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              responses: limitedResponses,
              count: limitedResponses.length,
              totalCount: responses.length,
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleGetConsoleLogs(params: unknown = {}) {
  const filter = ConsoleFilterSchema.parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    const logs = globalClient.getConsoleLogs({
      level: filter.level,
      limit: filter.limit,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              logs,
              count: logs.length,
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleGetBrowserStatus(_params: unknown = {}) {
  try {
    const connected = globalClient?.isConnected() ?? false;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              connected,
              status: connected ? "ready" : "disconnected",
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleCloseBrowser(_params: unknown = {}) {
  try {
    if (globalClient) {
      await globalClient.close();
      globalClient = null;
    }

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
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

export async function handleClickElement(params: unknown) {
  const { selector, timeout } = z
    .object({
      selector: z.string(),
      timeout: z.number().optional().default(30000),
    })
    .parse(params);

  if (!globalClient || !globalClient.isConnected()) {
    throw new Error("Browser not connected. Call start_browser first.");
  }

  try {
    const page = globalClient.getCurrentPage();
    if (!page) {
      throw new Error("No active page");
    }

    await page.click(selector, { timeout });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              selector,
              message: "Element clicked successfully",
              timestamp: Date.now(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              selector,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
