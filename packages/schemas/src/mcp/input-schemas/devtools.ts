import { ToolInputSchema } from "./types.js";
import { CommonInputSchemas } from "./common.js";

// ============================================================================
// CHROME DEVTOOLS MCP SERVER - Input Schemas
// ============================================================================

export const DevToolsInputSchemas = {
  // Chrome Management Tools
  startChrome: {
    type: "object",
    properties: {
      port: {
        type: "integer",
        minimum: 1024,
        maximum: 65535,
        default: 9222,
        description: "Port for Chrome remote debugging",
      },
      headless: {
        type: "boolean",
        default: false,
        description: "Run Chrome in headless mode",
      },
      chromePath: {
        type: "string",
        description: "Custom path to Chrome executable",
      },
      userDataDir: {
        type: "string",
        description: "Custom user data directory for Chrome",
      },
      url: {
        type: "string",
        description: "Initial URL to navigate to",
      },
      autoConnect: {
        type: "boolean",
        default: true,
        description: "Automatically connect after starting Chrome",
      },
      args: {
        type: "array",
        items: { type: "string" },
        description: "Additional Chrome command line arguments",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  connectToBrowser: {
    type: "object",
    properties: {
      port: {
        type: "integer",
        minimum: 1024,
        maximum: 65535,
        default: 9222,
        description: "Port of running Chrome instance",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  navigateToUrl: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to navigate to",
      },
      waitForLoad: {
        type: "boolean",
        default: true,
        description: "Wait for page load to complete",
      },
    },
    required: ["url"],
    additionalProperties: false,
  } as ToolInputSchema,

  getBrowserStatus: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  closeBrowser: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // Console Tools
  getConsoleLogs: {
    type: "object",
    properties: {
      level: {
        type: "string",
        enum: ["log", "info", "warn", "error", "debug", "trace"],
        description: "Filter by log level",
      },
      limit: CommonInputSchemas.optionalLimit,
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  executeJavaScript: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "JavaScript code to execute",
      },
      awaitPromise: {
        type: "boolean",
        default: false,
        description: "Whether to await promise resolution",
      },
    },
    required: ["code"],
    additionalProperties: false,
  } as ToolInputSchema,

  clearConsole: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // Network Tools
  getNetworkRequests: {
    type: "object",
    properties: {
      filter: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "Filter by domain",
          },
          method: {
            type: "string",
            description: "Filter by HTTP method",
          },
          status: {
            type: "integer",
            description: "Filter by status code",
          },
          resourceType: {
            type: "string",
            description: "Filter by resource type",
          },
        },
        additionalProperties: false,
      },
      limit: CommonInputSchemas.optionalLimit,
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  getNetworkResponse: {
    type: "object",
    properties: {
      requestId: {
        type: "string",
        description: "Request ID to get response for",
      },
    },
    required: ["requestId"],
    additionalProperties: false,
  } as ToolInputSchema,

  // DOM Tools
  getDocument: {
    type: "object",
    properties: {
      depth: {
        type: "integer",
        minimum: -1,
        default: 2,
        description: "Depth of DOM tree to retrieve (-1 for full tree)",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  querySelector: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "CSS selector to query",
      },
      all: {
        type: "boolean",
        default: false,
        description: "Whether to return all matching elements",
      },
    },
    required: ["selector"],
    additionalProperties: false,
  } as ToolInputSchema,

  getElementAttributes: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID",
      },
    },
    required: ["nodeId"],
    additionalProperties: false,
  } as ToolInputSchema,

  clickElement: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to click",
      },
    },
    required: ["nodeId"],
    additionalProperties: false,
  } as ToolInputSchema,

  getPageScreenshot: {
    type: "object",
    properties: {
      format: {
        type: "string",
        enum: ["png", "jpeg"],
        default: "png",
        description: "Screenshot format",
      },
      quality: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        default: 90,
        description: "JPEG quality (0-100)",
      },
      fullPage: {
        type: "boolean",
        default: false,
        description: "Capture full page",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // CSS Tools
  getComputedStyles: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to get computed styles for",
      },
    },
    required: ["nodeId"],
    additionalProperties: false,
  } as ToolInputSchema,

  getCSSRules: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to get CSS rules for",
      },
    },
    required: ["nodeId"],
    additionalProperties: false,
  } as ToolInputSchema,

  // Storage Tools
  getLocalStorage: {
    type: "object",
    properties: {
      origin: {
        type: "string",
        description:
          "Origin to get localStorage for (defaults to current page)",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  getSessionStorage: {
    type: "object",
    properties: {
      origin: {
        type: "string",
        description:
          "Origin to get sessionStorage for (defaults to current page)",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  getCookies: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        description: "Domain to get cookies for (defaults to current page)",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  // Advanced DOM Tools
  setElementText: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to set text for",
      },
      text: {
        type: "string",
        description: "Text content to set",
      },
    },
    required: ["nodeId", "text"],
    additionalProperties: false,
  } as ToolInputSchema,

  setElementAttribute: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to set attribute for",
      },
      name: {
        type: "string",
        description: "Attribute name",
      },
      value: {
        type: "string",
        description: "Attribute value",
      },
    },
    required: ["nodeId", "name", "value"],
    additionalProperties: false,
  } as ToolInputSchema,

  removeElement: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to remove",
      },
    },
    required: ["nodeId"],
    additionalProperties: false,
  } as ToolInputSchema,

  getElementStyles: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to get styles for",
      },
    },
    required: ["nodeId"],
    additionalProperties: false,
  } as ToolInputSchema,

  setElementStyle: {
    type: "object",
    properties: {
      nodeId: {
        type: "integer",
        description: "DOM node ID to set style for",
      },
      property: {
        type: "string",
        description: "CSS property name",
      },
      value: {
        type: "string",
        description: "CSS property value",
      },
    },
    required: ["nodeId", "property", "value"],
    additionalProperties: false,
  } as ToolInputSchema,

  // Debugging Tools
  setBreakpoint: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL of the script to set breakpoint in",
      },
      lineNumber: {
        type: "integer",
        description: "Line number to set breakpoint at",
      },
      columnNumber: {
        type: "integer",
        description: "Column number (optional)",
      },
      condition: {
        type: "string",
        description: "Breakpoint condition (optional)",
      },
    },
    required: ["url", "lineNumber"],
    additionalProperties: false,
  } as ToolInputSchema,

  removeBreakpoint: {
    type: "object",
    properties: {
      breakpointId: {
        type: "string",
        description: "ID of the breakpoint to remove",
      },
    },
    required: ["breakpointId"],
    additionalProperties: false,
  } as ToolInputSchema,

  evaluateExpression: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "JavaScript expression to evaluate",
      },
      objectGroup: {
        type: "string",
        description: "Object group for cleanup",
      },
      includeCommandLineAPI: {
        type: "boolean",
        default: true,
        description: "Include command line API",
      },
      silent: {
        type: "boolean",
        default: false,
        description: "Don't throw on side effects",
      },
      contextId: {
        type: "integer",
        description: "Execution context ID",
      },
      returnByValue: {
        type: "boolean",
        default: true,
        description: "Return result by value",
      },
      generatePreview: {
        type: "boolean",
        default: false,
        description: "Generate object preview",
      },
    },
    required: ["expression"],
    additionalProperties: false,
  } as ToolInputSchema,

  getCallStack: {
    type: "object",
    properties: {
      maxDepth: {
        type: "integer",
        default: 50,
        description: "Maximum stack depth to retrieve",
      },
    },
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  stepOver: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  stepInto: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  stepOut: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  resumeExecution: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,

  pauseExecution: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  } as ToolInputSchema,
} as const;
