// ============================================================================
// CHROME DEVTOOLS PROTOCOL CLIENT
// ============================================================================
// Handles Chrome browser automation and CDP communication

import { spawn, ChildProcess } from "child_process";
import CDP from "chrome-remote-interface";
import { chromium, Browser, Page, CDPSession } from "playwright";
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
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
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
  private domainFilter: string | null = null;

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
      "arc",
      "vivaldi",
      "opera",
    ];
    return validTypes.includes(browserPref as BrowserType)
      ? (browserPref as BrowserType)
      : undefined;
  }

  setDomainFilter(domain: string | null): void {
    this.domainFilter = domain;
  }

  getDomainFilter(): string | null {
    return this.domainFilter;
  }

  /**
   * Setup debug profile with bookmarks from main Chrome profile
   */
  private async setupDebugProfileWithBookmarks(
    debugProfilePath: string
  ): Promise<void> {
    const fs = await import("fs");
    const path = await import("path");

    try {
      // Main Chrome profile path on macOS
      const mainProfilePath = `${process.env.HOME}/Library/Application Support/Google/Chrome/Default`;
      const mainBookmarksFile = path.join(mainProfilePath, "Bookmarks");
      const debugBookmarksFile = path.join(
        debugProfilePath,
        "Default",
        "Bookmarks"
      );

      // Check if main profile bookmarks exist
      if (!fs.existsSync(mainBookmarksFile)) {
        console.log("📚 No main Chrome bookmarks found to copy");
        return;
      }

      // Create debug profile directory structure if it doesn't exist
      const debugDefaultDir = path.join(debugProfilePath, "Default");
      if (!fs.existsSync(debugDefaultDir)) {
        fs.mkdirSync(debugDefaultDir, { recursive: true });
        console.log("📁 Created debug profile directory");
      }

      // Copy bookmarks if they don't exist in debug profile or are older
      if (!fs.existsSync(debugBookmarksFile)) {
        fs.copyFileSync(mainBookmarksFile, debugBookmarksFile);
        console.log(
          "📚 Copied bookmarks from main Chrome profile to debug profile"
        );
      } else {
        // Check if main bookmarks are newer
        const mainStats = fs.statSync(mainBookmarksFile);
        const debugStats = fs.statSync(debugBookmarksFile);

        if (mainStats.mtime > debugStats.mtime) {
          fs.copyFileSync(mainBookmarksFile, debugBookmarksFile);
          console.log("📚 Updated debug profile bookmarks from main profile");
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to copy bookmarks:",
        error instanceof Error ? error.message : "Unknown error"
      );
      // Don't throw - this is non-critical
    }
  }

  /**
   * Ensure Chrome is running with debugging enabled
   * This implements "Always Start with Debugging" by auto-starting Chrome with debugging flags
   */
  private async ensureDebuggingEnabled(): Promise<void> {
    const port = this.connectionStatus.port;
    const browserInfo = this.getBrowserInfo();

    try {
      // Check if Chrome is already running with debugging enabled
      const targets = await CDP.List({ port });
      if (targets.length > 0) {
        console.log(
          `✅ ${browserInfo.name} is already running with debugging on port ${port}`
        );
        return;
      }
    } catch {
      // No debugging session found, need to start Chrome with debugging
    }

    console.log(
      `🔧 Starting ${browserInfo.name} with debugging enabled (Always Debug Mode)`
    );

    const chromePath = this.findChromeExecutable();

    // Use persistent debug profile for reliable debugging with bookmarks/logins
    // This creates a stable debug profile you can set up once and reuse
    const debugProfilePath =
      this.options.userDataDir ||
      process.env.DEVTOOLS_USER_DATA_DIR ||
      `${process.env.HOME || "/tmp"}/.chrome-debug-profile`;

    // Copy bookmarks from main Chrome profile to debug profile if needed
    await this.setupDebugProfileWithBookmarks(debugProfilePath);

    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${debugProfilePath}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-web-security", // Helpful for debugging
      "--disable-features=VizDisplayCompositor",
      "about:blank",
    ];

    console.log(`🚀 Launching: ${chromePath}`);
    console.log(`📋 Debug args: ${args.join(" ")}`);

    this.chromeProcess = spawn(chromePath, args, {
      detached: true,
      stdio: "ignore",
    });

    this.chromeProcess.on("error", (error) => {
      console.error(`${browserInfo.name} debug process error:`, error);
    });

    // Wait for Chrome to start with debugging
    await this.waitForChromeStartup();

    console.log(
      `✅ ${browserInfo.name} is now running with debugging on port ${port}`
    );
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
   * Now with "Always Start with Debugging" - automatically starts Chrome with debugging if needed
   */
  async connectToExistingBrowser(): Promise<ChromeConnectionStatus> {
    try {
      const port = this.connectionStatus.port;
      const browserInfo = this.getBrowserInfo();

      console.log(
        `🔍 Connecting to ${browserInfo.name} with debugging enabled...`
      );

      // Ensure Chrome is running with debugging enabled (Always Debug Mode)
      await this.ensureDebuggingEnabled();

      // Try to get available targets
      const targets = await CDP.List({ port });

      if (targets.length === 0) {
        throw new Error(
          `No targets found even after ensuring debugging is enabled. This should not happen.`
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
        this.client.Log.enable(),
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
        await this.client.Log.enable();
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

      // Use persistent debug profile for reliable debugging with bookmarks/logins
      // This creates a stable debug profile you can set up once and reuse
      const debugProfilePath =
        this.options.userDataDir ||
        process.env.DEVTOOLS_USER_DATA_DIR ||
        `${process.env.HOME || "/tmp"}/.chrome-debug-profile`;

      // Copy bookmarks from main Chrome profile to debug profile if needed
      await this.setupDebugProfileWithBookmarks(debugProfilePath);

      const args = [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${debugProfilePath}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-web-security", // Helpful for debugging
        "--disable-features=VizDisplayCompositor",
        ...(this.options.headless ? ["--headless", "--disable-gpu"] : []),
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
  // ENHANCED BROWSER MANAGEMENT WITH PLAYWRIGHT
  // ============================================================================

  async startWithPlaywright(): Promise<ChromeConnectionStatus> {
    try {
      const browserInfo = this.getBrowserInfo();
      const port = this.connectionStatus.port;

      console.log(`Starting ${browserInfo.name} with Playwright over CDP`);

      // Ensure Chrome is running with debugging enabled first
      await this.ensureDebuggingEnabled();

      // Connect to Chrome via CDP using Playwright
      const cdpEndpoint = `http://localhost:${port}`;
      this.browser = await chromium.connectOverCDP(cdpEndpoint);

      // Get the first page or create one
      const pages = this.browser.contexts()[0]?.pages() || [];
      if (pages.length > 0) {
        this.page = pages[0];
      } else {
        // Create a new page if none exist
        const context = await this.browser.newContext();
        this.page = await context.newPage();
      }

      // Navigate to URL if specified
      if (this.options.url) {
        await this.page.goto(this.options.url);
      }

      // Get CDP session for advanced debugging if needed
      this.cdpSession = await this.page.context().newCDPSession(this.page);

      // Connect traditional CDP client for existing functionality
      if (this.options.autoConnect) {
        await this.connect();
      }

      this.connectionStatus.connected = true;
      console.log(
        `✅ Successfully connected to ${browserInfo.name} via Playwright CDP`
      );

      return this.connectionStatus;
    } catch (error) {
      throw new Error(
        `Failed to start ${this.getBrowserInfo().name} with Playwright: ${error instanceof Error ? error.message : "Unknown error"}`
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
      // Use Playwright for screenshot capabilities
      const screenshotBuffer = await this.page.screenshot({
        fullPage: options?.fullPage || false,
        quality: options?.quality || 90,
        type: "png",
      });
      return screenshotBuffer.toString("base64");
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
      // Use Playwright for better evaluation
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

    if (this.cdpSession) {
      await this.cdpSession.detach();
      this.cdpSession = null;
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

    // Force kill Chrome processes if they're still running
    await this.forceKillChromeProcesses();
  }

  /**
   * Force kill Chrome processes by finding them in the process list
   */
  private async forceKillChromeProcesses(): Promise<void> {
    try {
      const { spawn } = await import("child_process");
      const port = this.connectionStatus.port;

      // Find Chrome processes with our debug port
      const findProcess = spawn("ps", ["aux"]);
      let output = "";

      findProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      await new Promise<void>((resolve) => {
        findProcess.on("close", () => {
          const lines = output.split("\n");
          const chromeProcesses = lines.filter(
            (line) =>
              line.includes("Google Chrome") &&
              line.includes(`--remote-debugging-port=${port}`)
          );

          // Extract PIDs and kill them
          chromeProcesses.forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 1) {
              const pid = parts[1];
              try {
                console.log(`Killing Chrome process PID: ${pid}`);
                process.kill(parseInt(pid), "SIGTERM");

                // Force kill after 3 seconds if still running
                setTimeout(() => {
                  try {
                    process.kill(parseInt(pid), "SIGKILL");
                  } catch {
                    // Process may already be dead
                  }
                }, 3000);
              } catch (error) {
                console.log(`Failed to kill Chrome process ${pid}:`, error);
              }
            }
          });

          resolve();
        });
      });
    } catch (error) {
      console.log("Failed to force kill Chrome processes:", error);
    }
  }
}
