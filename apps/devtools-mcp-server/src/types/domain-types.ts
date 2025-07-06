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

export interface ChromeTargetInfo {
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

export interface ConsoleArgument {
  type: string;
  value?: unknown;
  description?: string;
  objectId?: string;
  preview?: ObjectPreview;
}

export interface ObjectPreview {
  type: string;
  description: string;
  overflow: boolean;
  properties: PropertyPreview[];
}

export interface PropertyPreview {
  name: string;
  type: string;
  value?: string;
  valuePreview?: ObjectPreview;
}

export interface StackTrace {
  callFrames: CallFrame[];
  description?: string;
}

export interface CallFrame {
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

export interface ResourceTiming {
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

export interface DOMNode {
  nodeId: number;
  parentId?: number;
  backendNodeId: number;
  nodeType: number;
  nodeName: string;
  localName: string;
  nodeValue: string;
  childNodeCount?: number;
  children?: DOMNode[];
  attributes?: string[];
  documentURL?: string;
  baseURL?: string;
  publicId?: string;
  systemId?: string;
  internalSubset?: string;
  xmlVersion?: string;
  name?: string;
  value?: string;
  pseudoType?: string;
  shadowRootType?: string;
  frameId?: string;
  contentDocument?: DOMNode;
  shadowRoots?: DOMNode[];
  templateContent?: DOMNode;
  pseudoElements?: DOMNode[];
  importedDocument?: DOMNode;
  distributedNodes?: BackendNode[];
  isSVG?: boolean;
}

export interface BackendNode {
  nodeType: number;
  nodeName: string;
  backendNodeId: number;
}

export interface DOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ============================================================================
// CSS TYPES
// ============================================================================

export interface CSSStyle {
  styleSheetId?: string;
  cssProperties: CSSProperty[];
  shorthandEntries: ShorthandEntry[];
  cssText?: string;
  range?: SourceRange;
}

export interface CSSProperty {
  name: string;
  value: string;
  important?: boolean;
  implicit?: boolean;
  text?: string;
  parsedOk?: boolean;
  disabled?: boolean;
  range?: SourceRange;
}

export interface ShorthandEntry {
  name: string;
  value: string;
  important?: boolean;
}

export interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ComputedStyleProperty {
  name: string;
  value: string;
}

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

export interface PerformanceMetrics {
  Timestamp: number;
  Documents: number;
  Frames: number;
  JSEventListeners: number;
  Nodes: number;
  LayoutCount: number;
  RecalcStyleCount: number;
  LayoutDuration: number;
  RecalcStyleDuration: number;
  ScriptDuration: number;
  TaskDuration: number;
  JSHeapUsedSize: number;
  JSHeapTotalSize: number;
}

export interface PageInfo {
  url: string;
  title: string;
  loadTime: number;
  domContentLoadedTime: number;
  firstPaintTime: number;
  firstContentfulPaintTime: number;
  largestContentfulPaintTime?: number;
  metrics: PerformanceMetrics;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface StorageItem {
  key: string;
  value: string;
}

export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  size: number;
  httpOnly: boolean;
  secure: boolean;
  session: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

// ============================================================================
// SCREENSHOT TYPES
// ============================================================================

export interface ScreenshotOptions {
  format?: "jpeg" | "png";
  quality?: number;
  clip?: ViewportClip;
  fromSurface?: boolean;
}

export interface ViewportClip {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

// ============================================================================
// RESOURCE TYPES FOR MCP
// ============================================================================

export interface ChromeConsoleResource {
  id: string;
  type: "console-logs" | "console-errors";
  logs: ConsoleLogEntry[];
  uri: string;
  mimeType: string;
}

export interface ChromeNetworkResource {
  id: string;
  type: "network-requests" | "network-responses";
  requests: NetworkRequest[];
  responses: NetworkResponse[];
  uri: string;
  mimeType: string;
}

export interface ChromeDOMResource {
  id: string;
  type: "dom-structure" | "dom-elements";
  document: DOMNode;
  uri: string;
  mimeType: string;
}

export interface ChromePerformanceResource {
  id: string;
  type: "performance-metrics" | "page-info";
  metrics: PerformanceMetrics;
  pageInfo: PageInfo;
  uri: string;
  mimeType: string;
}

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
