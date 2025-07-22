// Flexible configuration for multiple Chromium-based browsers

import { existsSync } from "fs";
import { platform } from "os";
import type {
  BrowserType,
  BrowserInfo,
  BrowserConfigOptions,
} from "../types/domain-types.js";

// macOS-focused browser paths (Windows/Linux support can be added later)
const BROWSER_PATHS: Record<BrowserType, string[]> = {
  chrome: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  "chrome-canary": [
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ],
  chromium: ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
  brave: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
  arc: ["/Applications/Arc.app/Contents/MacOS/Arc"],
  vivaldi: ["/Applications/Vivaldi.app/Contents/MacOS/Vivaldi"],
  opera: ["/Applications/Opera.app/Contents/MacOS/Opera"],
  custom: [],
};

// ============================================================================
// BROWSER DESCRIPTIONS
// ============================================================================

const BROWSER_DESCRIPTIONS: Record<BrowserType, string> = {
  chrome: "Google Chrome - Default and most common Chromium browser",
  "chrome-canary": "Google Chrome Canary - Bleeding edge Chrome builds",
  chromium: "Chromium - Open source base for Chrome",
  brave: "Brave Browser - Privacy-focused browser with ad blocking",
  arc: "Arc Browser - Modern browser with unique UI and features",
  vivaldi: "Vivaldi - Feature-rich browser for power users",
  opera: "Opera - Browser with built-in VPN and tools",
  custom: "Custom browser path specified by user",
};

// ============================================================================
// ENVIRONMENT VARIABLE CONFIGURATION
// ============================================================================

function getBrowserFromEnv(): { type?: BrowserType; path?: string } {
  // Check for specific browser preference
  const browserPref =
    process.env.DEVTOOLS_BROWSER?.toLowerCase() as BrowserType;

  // Check for custom path
  const customPath = process.env.DEVTOOLS_BROWSER_PATH;

  return {
    type: browserPref,
    path: customPath,
  };
}

// ============================================================================
// BROWSER DETECTION AND CONFIGURATION
// ============================================================================

export class BrowserConfig {
  private detectedBrowsers: BrowserInfo[] = [];
  private selectedBrowser: BrowserInfo | null = null;

  constructor(private options: BrowserConfigOptions = {}) {
    if (this.options.enableAutoDetection !== false) {
      this.detectAvailableBrowsers();
    }
  }

  /**
   * Detect all available Chromium browsers on the system (macOS only for now)
   */
  private detectAvailableBrowsers(): void {
    const os = platform();

    if (os !== "darwin") {
      throw new Error(`Currently only macOS is supported. Platform: ${os}`);
    }

    this.detectedBrowsers = [];

    // Check each browser type
    for (const [browserType, paths] of Object.entries(BROWSER_PATHS)) {
      if (browserType === "custom") continue;

      for (const path of paths) {
        if (existsSync(path)) {
          this.detectedBrowsers.push({
            name: this.getBrowserDisplayName(browserType as BrowserType),
            type: browserType as BrowserType,
            executablePath: path,
            description: BROWSER_DESCRIPTIONS[browserType as BrowserType],
          });
          break; // Only add the first found path for each browser
        }
      }
    }
  }

  /**
   * Get the preferred browser based on configuration and environment
   */
  getBrowserExecutable(): string {
    // 1. Check for custom path in options
    if (this.options.customPath && existsSync(this.options.customPath)) {
      return this.options.customPath;
    }

    // 2. Check environment variables
    const envConfig = getBrowserFromEnv();
    if (envConfig.path && existsSync(envConfig.path)) {
      return envConfig.path;
    }

    // 3. Check for preferred browser type from env
    if (envConfig.type) {
      const browser = this.findBrowserByType(envConfig.type);
      if (browser) {
        return browser.executablePath;
      }
    }

    // 4. Check for preferred browser type from options
    if (this.options.preferredBrowser) {
      const browser = this.findBrowserByType(this.options.preferredBrowser);
      if (browser) {
        return browser.executablePath;
      }
    }

    // 5. Fall back to first available browser
    if (this.detectedBrowsers.length > 0) {
      return this.detectedBrowsers[0].executablePath;
    }

    // 6. No browsers found
    throw new Error(this.generateBrowserNotFoundError());
  }

  /**
   * Get information about the selected browser
   */
  getSelectedBrowserInfo(): BrowserInfo {
    const executablePath = this.getBrowserExecutable();

    // Find browser info for the selected executable
    const browserInfo = this.detectedBrowsers.find(
      (browser) => browser.executablePath === executablePath
    );

    if (browserInfo) {
      return browserInfo;
    }

    // Return custom browser info for non-detected browsers
    return {
      name: "Custom Browser",
      type: "custom",
      executablePath,
      description: "Custom Chromium-based browser",
    };
  }

  /**
   * Get all detected browsers
   */
  getAvailableBrowsers(): BrowserInfo[] {
    return [...this.detectedBrowsers];
  }

  /**
   * Find browser by type
   */
  private findBrowserByType(type: BrowserType): BrowserInfo | undefined {
    return this.detectedBrowsers.find((browser) => browser.type === type);
  }

  /**
   * Get display name for browser type
   */
  private getBrowserDisplayName(type: BrowserType): string {
    const names: Record<BrowserType, string> = {
      chrome: "Google Chrome",
      "chrome-canary": "Chrome Canary",
      chromium: "Chromium",
      brave: "Brave",
      arc: "Arc",
      vivaldi: "Vivaldi",
      opera: "Opera",
      custom: "Custom",
    };
    return names[type];
  }

  /**
   * Generate helpful error message when no browsers are found (macOS)
   */
  private generateBrowserNotFoundError(): string {
    return `No Chromium-based browser found on macOS.

Environment Variables:
  DEVTOOLS_BROWSER=chrome|brave|vivaldi|opera
  DEVTOOLS_BROWSER_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

Popular macOS Browsers:
  - Install Chrome: https://www.google.com/chrome/ (Default)
  - Install Brave: https://brave.com/

Or specify a custom path using the chromePath option.`;
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): {
    selectedBrowser: BrowserInfo;
    availableBrowsers: BrowserInfo[];
    environmentConfig: { type?: BrowserType; path?: string };
    options: BrowserConfigOptions;
  } {
    return {
      selectedBrowser: this.getSelectedBrowserInfo(),
      availableBrowsers: this.getAvailableBrowsers(),
      environmentConfig: getBrowserFromEnv(),
      options: this.options,
    };
  }
}
