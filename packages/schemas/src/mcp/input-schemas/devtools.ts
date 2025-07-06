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
} as const;
