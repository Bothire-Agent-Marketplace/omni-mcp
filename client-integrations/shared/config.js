/**
 * Shared Configuration for MCP Bridge System
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BridgeConfig {
  constructor() {
    this.defaultGatewayUrl = "http://localhost:37373";
    this.defaultOptions = {
      timeout: 30000,
      retries: 3,
      debug: process.env.MCP_BRIDGE_DEBUG === "true",
    };
  }

  /**
   * Get configuration for a specific client
   * @param {string} clientName - Name of the client (cursor, claude-desktop, etc.)
   * @param {object} overrides - Configuration overrides
   * @returns {object} Complete configuration
   */
  getClientConfig(clientName, overrides = {}) {
    const baseConfig = {
      gatewayUrl: process.env.MCP_GATEWAY_URL || this.defaultGatewayUrl,
      ...this.defaultOptions,
      clientName,
    };

    return { ...baseConfig, ...overrides };
  }

  /**
   * Get the path to a client-specific file
   * @param {string} clientName - Name of the client
   * @param {string} filename - Name of the file
   * @returns {string} Full path to the file
   */
  getClientFilePath(clientName, filename) {
    const clientDir = path.join(__dirname, "..", clientName);
    return path.join(clientDir, filename);
  }

  /**
   * Load client-specific configuration from JSON file
   * @param {string} clientName - Name of the client
   * @param {string} configFile - Name of the config file (default: config.json)
   * @returns {object} Configuration object or empty object if file doesn't exist
   */
  loadClientConfig(clientName, configFile = "config.json") {
    const configPath = this.getClientFilePath(clientName, configFile);

    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, "utf8");
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error(
        `Error loading client config for ${clientName}:`,
        error.message
      );
    }

    return {};
  }

  /**
   * Save client-specific configuration to JSON file
   * @param {string} clientName - Name of the client
   * @param {object} config - Configuration to save
   * @param {string} configFile - Name of the config file (default: config.json)
   */
  saveClientConfig(clientName, config, configFile = "config.json") {
    const configPath = this.getClientFilePath(clientName, configFile);

    try {
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(
        `Error saving client config for ${clientName}:`,
        error.message
      );
    }
  }

  /**
   * Get environment-specific configuration
   * @returns {object} Environment configuration
   */
  getEnvironmentConfig() {
    return {
      isDevelopment: process.env.NODE_ENV === "development",
      isProduction: process.env.NODE_ENV === "production",
      debug: process.env.MCP_BRIDGE_DEBUG === "true",
      gatewayUrl: process.env.MCP_GATEWAY_URL || this.defaultGatewayUrl,
      logLevel: process.env.MCP_BRIDGE_LOG_LEVEL || "info",
    };
  }
}

export default new BridgeConfig();
