// ============================================================================
// STREAMLINED DEVTOOLS TYPES - Essential Debugging Only
// ============================================================================

// ============================================================================
// BROWSER CONFIGURATION TYPES
// ============================================================================

export type BrowserType =
  | "chrome"
  | "chrome-canary"
  | "chromium"
  | "brave"
  | "vivaldi"
  | "opera"
  | "arc"
  | "custom";

export interface BrowserInfo {
  name: string;
  type: BrowserType;
  executablePath: string;
  description: string;
}

export interface BrowserConfigOptions {
  preferredBrowser?: BrowserType;
  customPath?: string;
  userDataDir?: string;
  enableAutoDetection?: boolean;
}

// ============================================================================
// CHROME CONNECTION TYPES
// ============================================================================

export interface ChromeConnectionStatus {
  connected: boolean;
  port: number;
  targetInfo?: {
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl?: string;
  };
}

export interface ChromeStartOptions {
  port?: number;
  headless?: boolean;
  chromePath?: string;
  userDataDir?: string;
  url?: string;
  autoConnect?: boolean;
  args?: string[];
}

// ============================================================================
// CONSOLE TYPES
// ============================================================================

export interface ConsoleLogEntry {
  type: "log" | "info" | "warn" | "error" | "debug" | "trace";
  args: unknown[];
  timestamp: number;
  level: number;
  text?: string;
  url?: string;
  lineNumber?: number;
}

// ============================================================================
// NETWORK TYPES
// ============================================================================

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: number;
  initiator: NetworkInitiator;
  documentURL?: string;
  resourceType?: string;
}

export interface NetworkResponse {
  requestId: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  mimeType?: string;
  connectionReused?: boolean;
  connectionId?: number;
  remoteIPAddress?: string;
  remotePort?: number;
  fromDiskCache?: boolean;
  fromServiceWorker?: boolean;
  encodedDataLength?: number;
  timing?: NetworkTiming;
}

export interface NetworkInitiator {
  type: "parser" | "script" | "preload" | "other";
  url?: string;
  lineNumber?: number;
  stack?: NetworkCallFrame[];
}

interface NetworkTiming {
  requestTime: number;
  proxyStart: number;
  proxyEnd: number;
  dnsStart: number;
  dnsEnd: number;
  connectStart: number;
  connectEnd: number;
  sslStart: number;
  sslEnd: number;
  workerStart: number;
  workerReady: number;
  sendStart: number;
  sendEnd: number;
  pushStart: number;
  pushEnd: number;
  receiveHeadersEnd: number;
}

interface NetworkCallFrame {
  functionName: string;
  scriptId: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}
