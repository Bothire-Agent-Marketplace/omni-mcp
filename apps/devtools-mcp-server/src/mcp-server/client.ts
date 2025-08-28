import { EventEmitter } from "events";
import {
  chromium,
  firefox,
  webkit,
  Browser,
  BrowserContext,
  Page,
  type BrowserContextOptions,
} from "playwright";

interface BrowserOptions {
  browserType?: "chromium" | "firefox" | "webkit";
  headless?: boolean;
  devtools?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  recordHar?: boolean;
  recordVideo?: boolean;
  slowMo?: number;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  resourceType: string;
  timestamp: number;
}

interface NetworkResponse {
  id: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  size: number;
  timestamp: number;
  body?: string;
}

interface ConsoleMessage {
  type: "log" | "error" | "warn" | "info" | "debug" | "trace";
  text: string;
  args: string[];
  location: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  timestamp: number;
}

export class PlaywrightClient extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;

  private networkRequests: Map<string, NetworkRequest> = new Map();
  private networkResponses: Map<string, NetworkResponse> = new Map();
  private consoleLogs: ConsoleMessage[] = [];

  constructor(options: BrowserOptions = {}) {
    super();
    this.options = {
      browserType: "chromium",
      headless: false,
      devtools: true,
      viewport: { width: 1280, height: 720 },
      recordHar: false,
      recordVideo: false,
      ...options,
    };
  }

  async start(): Promise<void> {
    if (this.browser) {
      console.log("✅ Browser already started");
      return;
    }

    try {
      const browserType = this.getBrowserType();

      this.browser = await browserType.launch({
        headless: this.options.headless,
        devtools: this.options.devtools,
        slowMo: this.options.slowMo,
        args: [
          "--disable-web-security",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
        ],
      });

      const contextOptions: BrowserContextOptions = {
        viewport: this.options.viewport,
        userAgent: this.options.userAgent,
        ignoreHTTPSErrors: true,
        permissions: ["clipboard-read", "clipboard-write"],
      };

      if (this.options.recordHar) {
        contextOptions.recordHar = { path: `har-${Date.now()}.har` };
      }

      if (this.options.recordVideo) {
        contextOptions.recordVideo = { dir: "videos/" };
      }

      this.context = await this.browser.newContext(contextOptions);

      this.page = await this.context.newPage();

      this.setupNetworkMonitoring();
      this.setupConsoleMonitoring();
      this.setupErrorHandling();

      console.log(
        `🚀 Playwright ${this.options.browserType} started successfully`
      );
      this.emit("connected");
    } catch (error) {
      console.error("❌ Failed to start browser:", error);
      throw error;
    }
  }

  private getBrowserType() {
    switch (this.options.browserType) {
      case "firefox":
        return firefox;
      case "webkit":
        return webkit;
      case "chromium":
      default:
        return chromium;
    }
  }

  private setupNetworkMonitoring(): void {
    if (!this.page) return;

    this.page.on("request", (request) => {
      const networkRequest: NetworkRequest = {
        id: this.generateRequestId(),
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() || undefined,
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      };

      this.networkRequests.set(networkRequest.id, networkRequest);
      this.emit("networkRequest", networkRequest);

      if (this.networkRequests.size > 1000) {
        const firstKey = this.networkRequests.keys().next().value;
        if (firstKey) {
          this.networkRequests.delete(firstKey);
        }
      }
    });

    this.page.on("response", async (response) => {
      const request = response.request();
      const requestId = this.findRequestId(request.url(), request.method());

      const networkResponse: NetworkResponse = {
        id: requestId || this.generateRequestId(),
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        size: parseInt(response.headers()["content-length"] || "0"),
        timestamp: Date.now(),
      };

      if (
        networkResponse.size < 1024 * 1024 &&
        (response.headers()["content-type"]?.includes("json") ||
          response.headers()["content-type"]?.includes("text"))
      ) {
        try {
          networkResponse.body = await response.text();
        } catch {}
      }

      this.networkResponses.set(networkResponse.id, networkResponse);
      this.emit("networkResponse", networkResponse);

      if (this.networkResponses.size > 1000) {
        const firstKey = this.networkResponses.keys().next().value;
        if (firstKey) {
          this.networkResponses.delete(firstKey);
        }
      }
    });

    this.page.on("requestfailed", (request) => {
      this.emit("networkRequestFailed", {
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: Date.now(),
      });
    });
  }

  private setupConsoleMonitoring(): void {
    if (!this.page) return;

    this.page.on("console", (msg) => {
      const consoleMessage: ConsoleMessage = {
        type: msg.type() as ConsoleMessage["type"],
        text: msg.text(),
        args: msg.args().map((arg) => arg.toString()),
        location: msg.location(),
        timestamp: Date.now(),
      };

      this.consoleLogs.push(consoleMessage);
      this.emit("consoleMessage", consoleMessage);

      if (this.consoleLogs.length > 1000) {
        this.consoleLogs.splice(0, this.consoleLogs.length - 1000);
      }
    });

    this.page.on("pageerror", (error) => {
      const errorMessage: ConsoleMessage = {
        type: "error",
        text: error.message,
        args: [error.stack || ""],
        location: { url: "", lineNumber: 0, columnNumber: 0 },
        timestamp: Date.now(),
      };

      this.consoleLogs.push(errorMessage);
      this.emit("consoleMessage", errorMessage);
      this.emit("pageError", error);
    });
  }

  private setupErrorHandling(): void {
    if (!this.context) return;

    this.context.on("page", (page) => {
      page.on("crash", () => {
        console.error("💥 Page crashed");
        this.emit("pageCrash");
      });
    });
  }

  async navigateToUrl(
    url: string,
    options: {
      waitUntil?: "domcontentloaded" | "load" | "networkidle";
      timeout?: number;
    } = {}
  ): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not started. Call start() first.");
    }

    const { waitUntil = "networkidle", timeout = 30000 } = options;

    try {
      await this.page.goto(url, { waitUntil, timeout });
      this.emit("navigation", { url, success: true });
    } catch (error) {
      this.emit("navigation", { url, success: false, error });
      throw error;
    }
  }

  async executeJavaScript(code: string): Promise<unknown> {
    if (!this.page) {
      throw new Error("Browser not started. Call start() first.");
    }

    try {
      const result = await this.page.evaluate(code);
      return result;
    } catch (error) {
      console.error("❌ JavaScript execution failed:", error);
      throw error;
    }
  }

  async takeScreenshot(
    options: {
      fullPage?: boolean;
      clip?: { x: number; y: number; width: number; height: number };
      quality?: number;
      type?: "png" | "jpeg";
    } = {}
  ): Promise<Buffer> {
    if (!this.page) {
      throw new Error("Browser not started. Call start() first.");
    }

    return await this.page.screenshot({
      fullPage: options.fullPage ?? true,
      clip: options.clip,
      quality: options.quality,
      type: options.type ?? "png",
    });
  }

  async getPerformanceMetrics(): Promise<Record<string, unknown>> {
    if (!this.page) {
      throw new Error("Browser not started. Call start() first.");
    }

    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType("paint");

      return {
        domContentLoaded:
          navigation?.domContentLoadedEventEnd -
          navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,

        firstPaint: paint.find((p) => p.name === "first-paint")?.startTime,
        firstContentfulPaint: paint.find(
          (p) => p.name === "first-contentful-paint"
        )?.startTime,

        totalResources: performance.getEntriesByType("resource").length,

        memoryUsage: (
          performance as unknown as {
            memory?: {
              usedJSHeapSize: number;
              totalJSHeapSize: number;
              jsHeapSizeLimit: number;
            };
          }
        ).memory
          ? {
              used: (
                performance as unknown as { memory: { usedJSHeapSize: number } }
              ).memory.usedJSHeapSize,
              total: (
                performance as unknown as {
                  memory: { totalJSHeapSize: number };
                }
              ).memory.totalJSHeapSize,
              limit: (
                performance as unknown as {
                  memory: { jsHeapSizeLimit: number };
                }
              ).memory.jsHeapSizeLimit,
            }
          : null,
      };
    });
  }

  getNetworkRequests(filter?: {
    domain?: string;
    method?: string;
    resourceType?: string;
    status?: number;
  }): NetworkRequest[] {
    let requests = Array.from(this.networkRequests.values());

    if (filter) {
      requests = requests.filter((req) => {
        if (filter.domain && !req.url.includes(filter.domain)) return false;
        if (filter.method && req.method !== filter.method) return false;
        if (filter.resourceType && req.resourceType !== filter.resourceType)
          return false;
        return true;
      });
    }

    return requests.sort((a, b) => b.timestamp - a.timestamp);
  }

  getNetworkResponses(filter?: {
    domain?: string;
    status?: number;
  }): NetworkResponse[] {
    let responses = Array.from(this.networkResponses.values());

    if (filter) {
      responses = responses.filter((res) => {
        if (filter.domain && !res.url.includes(filter.domain)) return false;
        if (filter.status && res.status !== filter.status) return false;
        return true;
      });
    }

    return responses.sort((a, b) => b.timestamp - a.timestamp);
  }

  getConsoleLogs(filter?: {
    level?: ConsoleMessage["type"];
    limit?: number;
  }): ConsoleMessage[] {
    let logs = [...this.consoleLogs];

    if (filter?.level) {
      logs = logs.filter((log) => log.type === filter.level);
    }

    logs = logs.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  async blockResources(
    types: string[] = ["image", "font", "media"]
  ): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not started. Call start() first.");
    }

    await this.page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();

      if (types.includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  clearData(): void {
    this.networkRequests.clear();
    this.networkResponses.clear();
    this.consoleLogs.length = 0;
  }

  getCurrentPage(): Page | null {
    return this.page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  isConnected(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.page = null;
    this.clearData();

    console.log("✅ Browser closed successfully");
    this.emit("disconnected");
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findRequestId(url: string, method: string): string | null {
    for (const [id, request] of this.networkRequests) {
      if (request.url === url && request.method === method) {
        return id;
      }
    }
    return null;
  }
}
