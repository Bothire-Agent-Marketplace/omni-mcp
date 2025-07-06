// ============================================================================
// CHROME DEVTOOLS MCP SERVER - TypeScript Types
// ============================================================================
// Chrome DevTools Protocol and browser automation types

// ============================================================================
// CHROME CONNECTION & STATUS TYPES
// ============================================================================

export interface ChromeConnectionStatus {
  connected: boolean;
  port: number;
  targetInfo?: ChromeTargetInfo;
  version?: string;
  userAgent?: string;
}

interface ChromeTargetInfo {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
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
  args: ConsoleArgument[];
  timestamp: number;
  level: number;
  text?: string;
  url?: string;
  lineNumber?: number;
  stackTrace?: StackTrace;
}

interface ConsoleArgument {
  type: string;
  value?: unknown;
  description?: string;
  objectId?: string;
  preview?: ObjectPreview;
}

interface ObjectPreview {
  type: string;
  description: string;
  overflow: boolean;
  properties: PropertyPreview[];
}

interface PropertyPreview {
  name: string;
  type: string;
  value?: string;
  valuePreview?: ObjectPreview;
}

interface StackTrace {
  callFrames: CallFrame[];
  description?: string;
}

interface CallFrame {
  functionName: string;
  scriptId: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
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
  initiator?: NetworkInitiator;
  documentURL?: string;
  resourceType?: string;
}

export interface NetworkResponse {
  requestId: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  mimeType: string;
  connectionReused: boolean;
  connectionId: number;
  remoteIPAddress?: string;
  remotePort?: number;
  fromDiskCache?: boolean;
  fromServiceWorker?: boolean;
  encodedDataLength: number;
  timing?: ResourceTiming;
}

export interface NetworkInitiator {
  type:
    | "parser"
    | "script"
    | "preload"
    | "other"
    | "SignedExchange"
    | "preflight";
  stack?: StackTrace;
  url?: string;
  lineNumber?: number;
}

interface ResourceTiming {
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

// ============================================================================
// DOM TYPES
// ============================================================================

// DOM interfaces removed - not currently used in implementation

// DOMRect interface removed - not currently used

// ============================================================================
// CSS TYPES
// ============================================================================

// CSS interfaces removed - not currently used in implementation

// ============================================================================
// PERFORMANCE TYPES (Future Implementation)
// ============================================================================
// Note: Performance domain not yet implemented

// ============================================================================
// STORAGE TYPES
// ============================================================================

// Storage interfaces removed - not currently used in implementation

// ============================================================================
// SCREENSHOT TYPES
// ============================================================================

// ScreenshotOptions interface removed - not currently used

// ============================================================================
// RESOURCE TYPES FOR MCP
// ============================================================================

// Chrome resource interfaces removed - not currently used in implementation

// ChromePerformanceResource removed - Performance domain not yet implemented

// ============================================================================
// BACKWARD COMPATIBILITY TYPES (for existing handlers)
// ============================================================================

export interface DevtoolsItemResource {
  id: string;
  title: string;
  description?: string;
  uri: string;
  mimeType: string;
}

export interface DevtoolsProjectResource {
  id: string;
  name: string;
  description?: string;
  uri: string;
  mimeType: string;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface RuntimeError {
  id: string;
  timestamp: number;
  message: string;
  source: string;
  line?: number;
  column?: number;
  stack?: string;
  type: "runtime";
  url?: string;
  scriptId?: string;
}

export interface NetworkError {
  id: string;
  timestamp: number;
  requestId: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  errorText: string;
  type: "network";
  resourceType?: string;
}

export interface ConsoleError {
  id: string;
  timestamp: number;
  level: "error" | "warn";
  message: string;
  source?: string;
  line?: number;
  column?: number;
  url?: string;
  type: "console";
  args?: ConsoleArgument[];
  stackTrace?: StackTrace;
}

export interface ErrorSummary {
  runtimeErrors: number;
  networkErrors: number;
  consoleErrors: number;
  totalErrors: number;
  lastErrorTime?: number;
}
