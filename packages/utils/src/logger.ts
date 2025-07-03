import winston from "winston";
import type { Environment } from "./validation.js";

// MCP-compliant logger interface
export interface McpLogContext {
  requestId?: string;
  method?: string;
  serverName?: string;
  sessionId?: string;
  toolName?: string;
  resourceUri?: string;
  promptName?: string;
  errorCode?: string;
  duration?: number;
  [key: string]: any;
}

// Custom format for MCP servers
const mcpFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      serverName,
      requestId,
      method,
      ...meta
    } = info;

    const logEntry: Record<string, any> = {
      timestamp,
      level,
      message,
      serverName:
        serverName || process.env.MCP_SERVER_NAME || "unknown-mcp-server",
      environment: info.environment,
      ...meta,
    };

    if (requestId) {
      logEntry.requestId = requestId;
    }

    if (method) {
      logEntry.method = method;
    }

    return JSON.stringify(logEntry);
  })
);

// Create the base logger
const createLogger = (options: {
  serverName?: string;
  logLevel: string;
  environment: Environment;
}) => {
  return winston.createLogger({
    level: options.logLevel,
    format: mcpFormat,
    defaultMeta: {
      serverName: options.serverName || process.env.MCP_SERVER_NAME,
      pid: process.pid,
      environment: options.environment,
    },
    transports: [
      // CRITICAL: All logs MUST go to stderr for MCP compliance
      new winston.transports.Console({
        stderrLevels: ["error", "warn", "info", "debug", "silly"],
      }),
    ],
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
      new winston.transports.Console({
        stderrLevels: ["error"],
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        stderrLevels: ["error"],
      }),
    ],
  });
};

// Enhanced logger class for MCP servers
export class McpLogger {
  private logger: winston.Logger;
  private serverName: string;
  private environment: Environment;
  private logLevel: string;

  constructor(options: {
    serverName: string;
    logLevel: string;
    environment: Environment;
  }) {
    this.serverName = options.serverName;
    this.logLevel = options.logLevel;
    this.environment = options.environment;
    this.logger = createLogger(options);
  }

  fork(childName: string): McpLogger {
    return new McpLogger({
      serverName: `${this.serverName}:${childName}`,
      logLevel: this.logLevel,
      environment: this.environment,
    });
  }

  // Core logging methods with MCP context
  debug(message: string, context?: McpLogContext) {
    this.logger.debug(message, { ...context, serverName: this.serverName });
  }

  info(message: string, context?: McpLogContext) {
    this.logger.info(message, { ...context, serverName: this.serverName });
  }

  warn(message: string, context?: McpLogContext) {
    this.logger.warn(message, { ...context, serverName: this.serverName });
  }

  error(message: string, error?: Error, context?: McpLogContext) {
    this.logger.error(message, {
      ...context,
      serverName: this.serverName,
      ...(error && {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      }),
    });
  }

  // MCP-specific logging methods
  mcpRequest(method: string, requestId: string, context?: McpLogContext) {
    this.info(`MCP request received: ${method}`, {
      ...context,
      method,
      requestId,
      phase: "request_received",
    });
  }

  mcpResponse(
    method: string,
    requestId: string,
    success: boolean,
    duration: number,
    context?: McpLogContext
  ) {
    this.info(`MCP request completed: ${method}`, {
      ...context,
      method,
      requestId,
      success,
      duration,
      phase: "request_completed",
    });
  }

  mcpError(
    method: string,
    requestId: string,
    error: Error,
    context?: McpLogContext
  ) {
    this.error(`MCP request failed: ${method}`, error, {
      ...context,
      method,
      requestId,
      phase: "request_failed",
    });
  }

  toolExecution(toolName: string, requestId: string, context?: McpLogContext) {
    this.info(`Tool execution started: ${toolName}`, {
      ...context,
      toolName,
      requestId,
      phase: "tool_execution_started",
    });
  }

  toolCompleted(
    toolName: string,
    requestId: string,
    success: boolean,
    duration: number,
    context?: McpLogContext
  ) {
    this.info(`Tool execution completed: ${toolName}`, {
      ...context,
      toolName,
      requestId,
      success,
      duration,
      phase: "tool_execution_completed",
    });
  }

  resourceAccess(
    resourceUri: string,
    requestId: string,
    context?: McpLogContext
  ) {
    this.info(`Resource access: ${resourceUri}`, {
      ...context,
      resourceUri,
      requestId,
      phase: "resource_access",
    });
  }

  promptGeneration(
    promptName: string,
    requestId: string,
    context?: McpLogContext
  ) {
    this.info(`Prompt generation: ${promptName}`, {
      ...context,
      promptName,
      requestId,
      phase: "prompt_generation",
    });
  }

  // Server lifecycle logging
  serverStartup(port?: number, context?: McpLogContext) {
    this.info("MCP server starting up", {
      ...context,
      phase: "startup",
      ...(port && { port }),
    });
  }

  serverReady(context?: McpLogContext) {
    this.info("MCP server ready", {
      ...context,
      phase: "ready",
    });
  }

  serverShutdown(context?: McpLogContext) {
    this.info("MCP server shutting down", {
      ...context,
      phase: "shutdown",
    });
  }

  // Dynamic log level control (MCP logging capability)
  setLevel(level: string) {
    this.logger.level = level;
    this.info(`Log level changed to: ${level}`, { phase: "log_level_changed" });
  }

  getLevel(): string {
    return this.logger.level;
  }
}

// Factory function for creating MCP loggers
export const createMcpLogger = (options: {
  serverName: string;
  logLevel: string;
  environment: Environment;
}): McpLogger => {
  return new McpLogger(options);
};

// Utility function to generate request IDs
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Global error handlers for MCP servers
export const setupGlobalErrorHandlers = (logger: McpLogger) => {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error, { phase: "uncaught_exception" });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error(
      "Unhandled rejection",
      reason instanceof Error ? reason : new Error(String(reason)),
      {
        phase: "unhandled_rejection",
        promise: promise.toString(),
      }
    );
  });

  process.on("SIGTERM", () => {
    logger.serverShutdown({ signal: "SIGTERM" });
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.serverShutdown({ signal: "SIGINT" });
    process.exit(0);
  });
};
