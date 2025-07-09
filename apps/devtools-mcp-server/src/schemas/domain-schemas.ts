import { z } from "zod";

// ============================================================================
// STREAMLINED DEVTOOLS SCHEMAS - Essential Debugging Only
// ============================================================================

// Chrome Management Schemas
export const StartChromeSchema = z.object({
  port: z.number().min(1024).max(65535).optional().default(9222),
  headless: z.boolean().optional().default(false),
  chromePath: z.string().optional(),
  userDataDir: z.string().optional(),
  url: z.string().optional(),
  autoConnect: z.boolean().optional().default(true),
  args: z.array(z.string()).optional(),
});

export const ConnectToBrowserSchema = z.object({
  port: z.number().min(1024).max(65535).optional().default(9222),
});

export const NavigateToUrlSchema = z.object({
  url: z.string(),
  waitForLoad: z.boolean().optional().default(true),
});

export const GetBrowserStatusSchema = z.object({});

export const CloseBrowserSchema = z.object({});

// Console Schemas
export const GetConsoleLogsSchema = z.object({
  level: z.enum(["log", "info", "warn", "error", "debug", "trace"]).optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
});

export const ExecuteJavaScriptSchema = z.object({
  code: z.string(),
  awaitPromise: z.boolean().optional().default(false),
});

export const ClearConsoleSchema = z.object({});

// Network Schemas
export const GetNetworkRequestsSchema = z.object({
  filter: z
    .object({
      domain: z.string().optional(),
      method: z.string().optional(),
      status: z.number().optional(),
      resourceType: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
});

export const GetNetworkResponseSchema = z.object({
  requestId: z.string(),
});
