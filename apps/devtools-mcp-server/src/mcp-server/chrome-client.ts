// ============================================================================
// CHROME DEVTOOLS PROTOCOL CLIENT
// ============================================================================
// Handles Chrome browser automation and CDP communication

import { spawn, ChildProcess } from "child_process";
import CDP from "chrome-remote-interface";
import puppeteer from "puppeteer-core";
import WebSocket, { WebSocketServer } from "ws";
import { BrowserConfig } from "../config/browser-config.js";
import type {
  BrowserType,
  ChromeConnectionStatus,
  ChromeStartOptions,
  ConsoleLogEntry,
  NetworkRequest,
  NetworkResponse,
  NetworkInitiator,
} from "../types/domain-types.js";

export class ChromeDevToolsClient {
  private client: CDP.Client | null = null;
  private chromeProcess: ChildProcess | null = null;
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private streamingWs: WebSocket | null = null;
  private connectionStatus: ChromeConnectionStatus = {
    connected: false,
    port: 9222,
  };
  private consoleListeners: ((log: ConsoleLogEntry) => void)[] = [];
  private networkListeners: {
    onRequest?: (request: NetworkRequest) => void;
    onResponse?: (response: NetworkResponse) => void;
  } = {};
  private streamingEnabled = false;
  private browserConfig: BrowserConfig;

  constructor(private options: ChromeStartOptions = {}) {
    this.connectionStatus.port = options.port || 9222;

    // Initialize browser configuration
    this.browserConfig = new BrowserConfig({
      customPath: options.chromePath,
      preferredBrowser: this.getBrowserTypeFromEnv(),
      enableAutoDetection: true,
    });
  }

  /**
   * Get browser type preference from environment variables
   */
  private getBrowserTypeFromEnv(): BrowserType | undefined {
    const browserPref = process.env.DEVTOOLS_BROWSER?.toLowerCase();
    const validTypes: BrowserType[] = [
      "chrome",
      "chrome-canary",
      "chromium",
      "brave",
      "edge",
      "arc",
      "vivaldi",
      "opera",
    ];
    return validTypes.includes(browserPref as BrowserType)
      ? (browserPref as BrowserType)
      : undefined;
  }

  // ============================================================================
  // CHROME EXECUTABLE DETECTION (Cross-platform)
  // ============================================================================

  /**
   * Get the browser executable path using the new browser configuration system
   */
  private findChromeExecutable(): string {
    try {
      return this.browserConfig.getBrowserExecutable();
    } catch (error) {
      throw new Error(
        `Browser executable not found: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get information about the currently configured browser
   */
  getBrowserInfo() {
    return this.browserConfig.getSelectedBrowserInfo();
  }

  /**
   * Get all available browsers on the system
   */
  getAvailableBrowsers() {
    return this.browserConfig.getAvailableBrowsers();
  }

  /**
   * Get browser configuration summary for debugging
   */
  getBrowserConfigSummary() {
    return this.browserConfig.getConfigSummary();
  }

  // ============================================================================
  // BROWSER STARTUP AND CONNECTION
  // ============================================================================

  /**
   * Connect to an existing browser instance (Chrome/Chromium) without starting a new one
   */
  async connectToExistingBrowser(): Promise<ChromeConnectionStatus> {
    try {
      const port = this.connectionStatus.port;
      const browserInfo = this.getBrowserInfo();

      console.log(
        `🔍 Attempting to connect to existing ${browserInfo.name} instance on port ${port}...`
      );

      // Try to get available targets
      const targets = await CDP.List({ port });

      if (targets.length === 0) {
        throw new Error(
          `No targets found. Make sure ${browserInfo.name} is running with debugging enabled:\n` +
            `  ${browserInfo.executablePath} --remote-debugging-port=${port}`
        );
      }

      console.log(`📋 Found ${targets.length} targets:`);
      targets.forEach((t, index) => {
        console.log(`  ${index + 1}. [${t.type}] ${t.title} (${t.url})`);
      });

      // Find the most likely "active" tab using heuristics
      const activeTarget = this.findActiveTarget(targets);

      if (!activeTarget) {
        throw new Error("No suitable page target found");
      }

      console.log(
        `✅ Connecting to most likely active tab: ${activeTarget.title} (${activeTarget.url})`
      );

      // Connect to the selected target
      this.client = await CDP({ target: activeTarget, port });

      // Enable essential domains for streamlined debugging
      await this.enableEssentialDomains(activeTarget);

      // Set up event listeners
      this.setupEventListeners();

      this.connectionStatus = {
        connected: true,
        port,
        targetInfo: {
          id: activeTarget.id,
          title: activeTarget.title,
          type: activeTarget.type,
          url: activeTarget.url,
          webSocketDebuggerUrl: activeTarget.webSocketDebuggerUrl,
        },
      };

      return this.connectionStatus;
    } catch (error) {
      throw new Error(
        `Failed to connect to existing browser: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Find the most likely "active" tab using heuristics
   */
  private findActiveTarget(targets: CDP.Target[]): CDP.Target | null {
    // Filter to only page targets (not extensions, service workers, etc.)
    const pageTargets = targets.filter((t) => t.type === "page");

    if (pageTargets.length === 0) {
      return null;
    }

    // If only one page target, use it
    if (pageTargets.length === 1) {
      return pageTargets[0];
    }

    // Heuristics to find the most likely active tab:

    // 1. Prefer tabs that are not "about:blank" or empty
    const nonBlankTargets = pageTargets.filter(
      (t) =>
        t.url && !t.url.startsWith("about:") && !t.url.startsWith("chrome:")
    );

    if (nonBlankTargets.length === 1) {
      return nonBlankTargets[0];
    }

    // 2. If we have multiple real pages, prefer the one with the most recent activity
    // Since CDP doesn't provide last activity time, we'll use URL patterns and title as hints
    const activeTargets =
      nonBlankTargets.length > 0 ? nonBlankTargets : pageTargets;

    // 3. Prefer tabs with actual content (have a meaningful title)
    const titledTargets = activeTargets.filter(
      (t) => t.title && t.title !== "about:blank" && t.title !== ""
    );

    if (titledTargets.length > 0) {
      // Return the first one with a meaningful title
      return titledTargets[0];
    }

    // 4. Fall back to the first available page target
    return pageTargets[0];
  }

  /**
   * Enable essential domains based on target type
   */
  private async enableEssentialDomains(target: CDP.Target): Promise<void> {
    if (!this.client) return;

    const enablePromises = [];

    if (target.type === "page") {
      // Full page target - enable essential domains only
      enablePromises.push(
        this.client.Console.enable(),
        this.client.Network.enable(),
        this.client.Runtime.enable(),
        this.client.Page.enable()
      );
    } else {
      // Service worker or other target - only enable basic domains
      console.log(
        `Connecting to ${target.type} target, enabling limited domains`
      );
      enablePromises.push(this.client.Runtime.enable());

      // Try to enable Console if available
      try {
        await this.client.Console.enable();
        enablePromises.push(Promise.resolve());
      } catch {
        console.log("Console domain not available for this target type");
      }
    }

    await Promise.all(enablePromises);
  }

  async startChrome(): Promise<ChromeConnectionStatus> {
    try {
      const browserInfo = this.getBrowserInfo();
      const port = this.connectionStatus.port;

      // Try to connect to existing browser instance first
      console.log(
        `Checking for existing ${browserInfo.name} instance on port ${port}...`
      );

      try {
        const targets = await CDP.List({ port });
        if (targets.length > 0) {
          console.log(
            `✅ Found existing ${browserInfo.name} instance with ${targets.length} targets`
          );
          if (this.options.autoConnect) {
            await this.connectToExistingBrowser();
          }
          return this.connectionStatus;
        }
      } catch {
        console.log(
          `No existing ${browserInfo.name} instance found on port ${port}, will start new instance`
        );
      }

      const chromePath = this.findChromeExecutable();
      const args = [
        `--remote-debugging-port=${port}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        ...(this.options.headless ? ["--headless", "--disable-gpu"] : []),
        ...(this.options.userDataDir
          ? [`--user-data-dir=${this.options.userDataDir}`]
          : ["--no-sandbox"]),
        ...(this.options.args || []),
        this.options.url || "about:blank",
      ];

      console.log(
        `Starting ${browserInfo.name} (${browserInfo.type}): ${chromePath}`
      );
      console.log(`Browser args: ${args.join(" ")}`);

      this.chromeProcess = spawn(chromePath, args, {
        detached: false,
        stdio: "pipe",
      });

      this.chromeProcess.on("error", (error) => {
        console.error(`${browserInfo.name} process error:`, error);
        this.connectionStatus.connected = false;
      });

      this.chromeProcess.on("exit", (code) => {
        console.log(`${browserInfo.name} process exited with code: ${code}`);
        this.connectionStatus.connected = false;
        this.client = null;
      });

      // Wait for browser to start up
      await this.waitForChromeStartup();

      if (this.options.autoConnect) {
        await this.connect();
      }

      return this.connectionStatus;
    } catch (error) {
      throw new Error(
        `Failed to start browser: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async waitForChromeStartup(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const targets = await CDP.List({ port: this.connectionStatus.port });
        if (targets.length > 0) {
          return;
        }
      } catch {
        // Chrome not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("Chrome failed to start within timeout period");
  }

  async connect(): Promise<ChromeConnectionStatus> {
    try {
      // Wait for a page target to be available, with retries
      let target = null;
      const maxAttempts = 10;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const targets = await CDP.List({ port: this.connectionStatus.port });

        // Log discovered targets for debugging
        console.log(`📋 Discovered ${targets.length} targets:`);
        targets.forEach((t, index) => {
          console.log(`  ${index + 1}. [${t.type}] ${t.title} (${t.url})`);
        });

        // Use the improved target selection logic
        target = this.findActiveTarget(targets);

        if (target) {
          console.log(
            `✅ Found active target: ${target.title} (${target.url})`
          );
          break;
        }

        // If no suitable target found and this is the last attempt, use any available page target
        if (attempt === maxAttempts && targets.length > 0) {
          const pageTarget = targets.find((t) => t.type === "page");
          if (pageTarget) {
            target = pageTarget;
            console.log(
              `⚠️ No ideal target found, using page target: ${target.title}`
            );
            break;
          }
        }

        // Wait before retrying
        if (attempt < maxAttempts) {
          console.log(
            `Waiting for suitable target... (attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!target) {
        throw new Error("No suitable target found");
      }

      this.client = await CDP({ target, port: this.connectionStatus.port });

      // Enable essential domains using the new method
      await this.enableEssentialDomains(target);

      // Set up event listeners
      this.setupEventListeners();

      this.connectionStatus = {
        connected: true,
        port: this.connectionStatus.port,
        targetInfo: {
          id: target.id,
          title: target.title,
          type: target.type,
          url: target.url,
          webSocketDebuggerUrl: target.webSocketDebuggerUrl,
        },
      };

      return this.connectionStatus;
    } catch (error) {
      throw new Error(
        `Failed to connect to Chrome: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    // Console events
    this.client.Console.messageAdded((params) => {
      const logEntry: ConsoleLogEntry = {
        type: params.message.level as ConsoleLogEntry["type"],
        args: [], // CDP doesn't provide parameters in this format
        timestamp: Date.now(),
        level:
          params.message.level === "error"
            ? 3
            : params.message.level === "warning"
              ? 2
              : 1,
        text: params.message.text,
        url: params.message.url,
        lineNumber: params.message.line,
      };

      this.consoleListeners.forEach((listener) => listener(logEntry));
    });

    // Network events
    this.client.Network.requestWillBeSent((params) => {
      const request: NetworkRequest = {
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
        timestamp: params.timestamp,
        initiator: params.initiator as NetworkInitiator, // Cast to our extended type
        documentURL: params.documentURL,
        resourceType: params.type,
      };

      if (this.networkListeners.onRequest) {
        this.networkListeners.onRequest(request);
      }
    });

    this.client.Network.responseReceived((params) => {
      const response: NetworkResponse = {
        requestId: params.requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        headers: params.response.headers,
        mimeType: params.response.mimeType,
        connectionReused: params.response.connectionReused,
        connectionId: params.response.connectionId,
        remoteIPAddress: params.response.remoteIPAddress,
        remotePort: params.response.remotePort,
        fromDiskCache: params.response.fromDiskCache,
        fromServiceWorker: params.response.fromServiceWorker,
        encodedDataLength: params.response.encodedDataLength,
        timing: params.response.timing,
      };

      if (this.networkListeners.onResponse) {
        this.networkListeners.onResponse(response);
      }
    });
  }

  // ============================================================================
  // CONNECTION STATUS AND MANAGEMENT
  // ============================================================================

  getConnectionStatus(): ChromeConnectionStatus {
    return { ...this.connectionStatus };
  }

  isConnected(): boolean {
    return this.connectionStatus.connected && this.client !== null;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.connectionStatus.connected = false;
  }

  async closeBrowser(): Promise<void> {
    await this.disconnect();

    if (this.chromeProcess) {
      this.chromeProcess.kill("SIGTERM");

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        if (!this.chromeProcess) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          if (this.chromeProcess) {
            this.chromeProcess.kill("SIGKILL");
          }
          resolve();
        }, 5000);

        this.chromeProcess.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.chromeProcess = null;
    }
  }

  // ============================================================================
  // BASIC NAVIGATION
  // ============================================================================

  async navigateToUrl(url: string): Promise<void> {
    if (!this.client) {
      throw new Error("Not connected to Chrome");
    }

    await this.client.Page.navigate({ url });
    await this.client.Page.loadEventFired();
  }

  // ============================================================================
  // EVENT LISTENER MANAGEMENT
  // ============================================================================

  addConsoleListener(listener: (log: ConsoleLogEntry) => void): void {
    this.consoleListeners.push(listener);
  }

  removeConsoleListener(listener: (log: ConsoleLogEntry) => void): void {
    const index = this.consoleListeners.indexOf(listener);
    if (index !== -1) {
      this.consoleListeners.splice(index, 1);
    }
  }

  setNetworkListeners(listeners: {
    onRequest?: (request: NetworkRequest) => void;
    onResponse?: (response: NetworkResponse) => void;
  }): void {
    this.networkListeners = listeners;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getClient(): CDP.Client | null {
    return this.client;
  }

  async waitForPageLoad(timeout = 30000): Promise<void> {
    if (!this.client) {
      throw new Error("Not connected to Chrome");
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Page load timeout"));
      }, timeout);

      this.client!.Page.loadEventFired(() => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  // ============================================================================
  // ENHANCED BROWSER MANAGEMENT WITH PUPPETEER
  // ============================================================================

  async startWithPuppeteer(): Promise<ChromeConnectionStatus> {
    try {
      const chromePath = this.findChromeExecutable();
      const browserInfo = this.getBrowserInfo();

      console.log(`Starting ${browserInfo.name} with Puppeteer: ${chromePath}`);

      this.browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: this.options.headless || false,
        args: [
          `--remote-debugging-port=${this.connectionStatus.port}`,
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          ...(this.options.userDataDir
            ? [`--user-data-dir=${this.options.userDataDir}`]
            : ["--no-sandbox"]),
          ...(this.options.args || []),
        ],
      });

      this.page = await this.browser.newPage();

      if (this.options.url) {
        await this.page.goto(this.options.url);
      }

      // Connect CDP for advanced debugging
      if (this.options.autoConnect) {
        await this.connect();
      }

      this.connectionStatus.connected = true;
      return this.connectionStatus;
    } catch (error) {
      throw new Error(
        `Failed to start ${this.getBrowserInfo().name} with Puppeteer: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // ============================================================================
  // REAL-TIME STREAMING WITH WEBSOCKET
  // ============================================================================

  async enableStreaming(wsPort = 8080): Promise<void> {
    if (this.streamingEnabled) {
      return;
    }

    try {
      // Create WebSocket server for real-time streaming
      const wss = new WebSocketServer({ port: wsPort });

      wss.on("connection", (ws: WebSocket) => {
        this.streamingWs = ws;

        // Send initial connection status
        ws.send(
          JSON.stringify({
            type: "connection",
            status: this.connectionStatus,
            timestamp: Date.now(),
          })
        );

        // Set up real-time event streaming
        this.setupStreamingListeners(ws);
      });

      this.streamingEnabled = true;
      console.log(`WebSocket streaming enabled on port ${wsPort}`);
    } catch (error) {
      console.error("Failed to enable streaming:", error);
      throw error;
    }
  }

  private setupStreamingListeners(ws: WebSocket): void {
    if (!this.client) return;

    // Stream console events
    this.client.Console.messageAdded((params) => {
      ws.send(
        JSON.stringify({
          type: "console",
          data: params,
          timestamp: Date.now(),
        })
      );
    });

    // Stream network events
    this.client.Network.requestWillBeSent((params) => {
      ws.send(
        JSON.stringify({
          type: "network_request",
          data: params,
          timestamp: Date.now(),
        })
      );
    });

    this.client.Network.responseReceived((params) => {
      ws.send(
        JSON.stringify({
          type: "network_response",
          data: params,
          timestamp: Date.now(),
        })
      );
    });

    // Stream runtime exceptions
    this.client.Runtime.exceptionThrown((params) => {
      ws.send(
        JSON.stringify({
          type: "runtime_exception",
          data: params,
          timestamp: Date.now(),
        })
      );
    });

    // Note: Debugger events removed in streamlined version
  }

  // ============================================================================
  // ENHANCED DEBUGGING CAPABILITIES
  // ============================================================================

  async takeScreenshot(options?: {
    fullPage?: boolean;
    quality?: number;
  }): Promise<string> {
    if (this.page) {
      // Use Puppeteer for better screenshot capabilities
      return (await this.page.screenshot({
        fullPage: options?.fullPage || false,
        quality: options?.quality || 90,
        encoding: "base64",
      })) as string;
    } else if (this.client) {
      // Fallback to CDP
      const screenshot = await this.client.Page.captureScreenshot({
        format: "png",
        captureBeyondViewport: options?.fullPage || false,
      });
      return screenshot.data;
    } else {
      throw new Error("No browser connection available");
    }
  }

  async evaluateInPage(expression: string): Promise<unknown> {
    if (this.page) {
      // Use Puppeteer for better evaluation
      return await this.page.evaluate(expression);
    } else if (this.client) {
      // Fallback to CDP
      const result = await this.client.Runtime.evaluate({
        expression,
        returnByValue: true,
      });
      return result.result.value;
    } else {
      throw new Error("No browser connection available");
    }
  }

  async closeBrowserEnhanced(): Promise<void> {
    if (this.streamingWs) {
      this.streamingWs.close();
      this.streamingWs = null;
    }

    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    await this.closeBrowser(); // Call original method for CDP cleanup
  }
}
