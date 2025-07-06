// ============================================================================
// CHROME DEVTOOLS PROTOCOL CLIENT
// ============================================================================
// Handles Chrome browser automation and CDP communication

import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { join } from "path";
import CDP from "chrome-remote-interface";
import type {
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
  private connectionStatus: ChromeConnectionStatus = {
    connected: false,
    port: 9222,
  };
  private consoleListeners: ((log: ConsoleLogEntry) => void)[] = [];
  private networkListeners: {
    onRequest?: (request: NetworkRequest) => void;
    onResponse?: (response: NetworkResponse) => void;
  } = {};

  constructor(private options: ChromeStartOptions = {}) {
    this.connectionStatus.port = options.port || 9222;
  }

  // ============================================================================
  // CHROME EXECUTABLE DETECTION (Cross-platform)
  // ============================================================================

  private findChromeExecutable(): string {
    if (this.options.chromePath && existsSync(this.options.chromePath)) {
      return this.options.chromePath;
    }

    const os = platform();
    const possiblePaths: string[] = [];

    switch (os) {
      case "darwin": // macOS
        possiblePaths.push(
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
          "/Applications/Chromium.app/Contents/MacOS/Chromium"
        );
        break;

      case "win32": {
        // Windows
        const programFiles = process.env["PROGRAMFILES"] || "C:\\Program Files";
        const programFilesX86 =
          process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
        possiblePaths.push(
          join(programFiles, "Google\\Chrome\\Application\\chrome.exe"),
          join(programFilesX86, "Google\\Chrome\\Application\\chrome.exe"),
          join(programFiles, "Google\\Chrome SxS\\Application\\chrome.exe"),
          join(programFilesX86, "Google\\Chrome SxS\\Application\\chrome.exe")
        );
        break;
      }

      case "linux": {
        // Linux
        possiblePaths.push(
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
          "/snap/bin/chromium"
        );
        break;
      }

      default:
        throw new Error(`Unsupported platform: ${os}`);
    }

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error(
      `Chrome executable not found. Please install Chrome or specify chromePath in options. Searched: ${possiblePaths.join(", ")}`
    );
  }

  // ============================================================================
  // BROWSER STARTUP AND CONNECTION
  // ============================================================================

  async startChrome(): Promise<ChromeConnectionStatus> {
    try {
      const chromePath = this.findChromeExecutable();
      const port = this.connectionStatus.port;

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

      console.log(`Starting Chrome: ${chromePath} ${args.join(" ")}`);

      this.chromeProcess = spawn(chromePath, args, {
        detached: false,
        stdio: "pipe",
      });

      this.chromeProcess.on("error", (error) => {
        console.error("Chrome process error:", error);
        this.connectionStatus.connected = false;
      });

      this.chromeProcess.on("exit", (code) => {
        console.log(`Chrome process exited with code: ${code}`);
        this.connectionStatus.connected = false;
        this.client = null;
      });

      // Wait for Chrome to start up
      await this.waitForChromeStartup();

      if (this.options.autoConnect) {
        await this.connect();
      }

      return this.connectionStatus;
    } catch (error) {
      throw new Error(
        `Failed to start Chrome: ${error instanceof Error ? error.message : "Unknown error"}`
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
      const targets = await CDP.List({ port: this.connectionStatus.port });
      const target = targets.find((t) => t.type === "page") || targets[0];

      if (!target) {
        throw new Error("No suitable target found");
      }

      this.client = await CDP({ target, port: this.connectionStatus.port });

      // Enable necessary domains
      await Promise.all([
        this.client.Console.enable(),
        this.client.Network.enable(),
        this.client.DOM.enable(),
        this.client.Runtime.enable(),
        this.client.Page.enable(),
        this.client.CSS.enable(),
        this.client.DOMStorage.enable(),
        this.client.Debugger.enable(),
      ]);

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
}
