import { randomBytes } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { BridgeOptions, ServerEndpoint } from "../types/client-types.js";
import { BaseBridge } from "./base-bridge.js";

export class MCPRemoteBridge extends BaseBridge {
  constructor(serverEndpoint: ServerEndpoint, options: BridgeOptions = {}) {
    super(serverEndpoint, options);
  }

  generateCommand(): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  } {
    const args = [this.serverEndpoint.url];

    if (this.options.debug) {
      args.push("--debug");
    }

    if (this.options.timeout && this.options.timeout !== 30000) {
      args.push("--timeout", this.options.timeout.toString());
    }

    if (
      this.options.allowHttp ||
      this.serverEndpoint.url.startsWith("http://")
    ) {
      args.push("--allow-http");
    }

    if (this.options.transport && this.options.transport !== "http-first") {
      args.push("--transport", this.options.transport);
    }

    const allHeaders = {
      ...this.serverEndpoint.headers,
      ...this.options.headers,
    };
    for (const [key, value] of Object.entries(allHeaders)) {
      args.push("--header", `${key}: ${value}`);
    }

    if (this.options.staticOAuthClientMetadata) {
      args.push(
        "--static-oauth-client-metadata",
        this.options.staticOAuthClientMetadata
      );
    }

    if (this.options.staticOAuthClientInfo) {
      args.push(
        "--static-oauth-client-info",
        this.options.staticOAuthClientInfo
      );
    }

    const env: Record<string, string> = {};

    if (this.serverEndpoint.authRequired) {
      env.MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || "";
      env.MCP_CLIENT_ID = process.env.MCP_CLIENT_ID || "";
      env.MCP_CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || "";
    }

    return {
      command: "mcp-remote",
      args,
      env: Object.keys(env).length > 0 ? env : undefined,
    };
  }

  async validate(): Promise<boolean> {
    try {
      const { execSync } = await import("child_process");

      try {
        execSync("which mcp-remote", { stdio: "ignore" });
      } catch {
        try {
          execSync("pnpm mcp-remote --version", { stdio: "ignore" });
        } catch {
          console.warn(
            "⚠️  mcp-remote not found. Install with: pnpm add -g mcp-remote"
          );
          return false;
        }
      }

      new URL(this.serverEndpoint.url);

      return true;
    } catch (error) {
      console.error("❌ Bridge validation failed:", error);
      return false;
    }
  }

  getClientCommand(): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  } {
    if (
      this.serverEndpoint.url.includes("localhost") ||
      this.serverEndpoint.url.includes("127.0.0.1")
    ) {
      return this.getLocalGatewayCommand();
    }

    const { command, args, env } = this.generateCommand();

    return {
      command,
      args,
      env,
    };
  }

  private getLocalGatewayCommand(): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  } {
    const bridgeScriptPath = this.createBridgeScriptFile();

    const env: Record<string, string> = {
      GATEWAY_URL: this.serverEndpoint.url,
      DEBUG: this.options.debug ? "1" : "0",
    };

    const apiKey = this.serverEndpoint.headers?.["x-api-key"];
    if (typeof apiKey === "string") {
      env.MCP_API_KEY = apiKey;
    }

    return {
      command: "node",
      args: [bridgeScriptPath],
      env,
    };
  }

  private createBridgeScriptFile(): string {
    const scriptId = randomBytes(8).toString("hex");
    const scriptDir = join(tmpdir(), "mcp-bridge");
    const scriptPath = join(scriptDir, `mcp-bridge-${scriptId}.js`);

    try {
      mkdirSync(scriptDir, { recursive: true });
    } catch {}

    const scriptContent = `#!/usr/bin/env node
const { stdin, stdout, stderr } = process;
const gatewayUrl = process.env.GATEWAY_URL + '/mcp';
const debug = process.env.DEBUG === '1';
const apiKey = process.env.MCP_API_KEY;

if (debug) stderr.write('Starting MCP bridge to: ' + gatewayUrl + '\\n');
if (debug && apiKey) stderr.write('Using API key: ' + apiKey.substring(0, 8) + '...\\n');

let inputBuffer = '';

stdin.on('data', (chunk) => {
  inputBuffer += chunk.toString();
  const lines = inputBuffer.split('\\n');
  inputBuffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      handleRequest(JSON.parse(line.trim()));
    }
  }
});

async function handleRequest(request) {
  try {
    if (debug) stderr.write('-> ' + JSON.stringify(request) + '\\n');
    
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });
    
    const result = await response.json();
    if (debug) stderr.write('<- ' + JSON.stringify(result) + '\\n');
    
    stdout.write(JSON.stringify(result) + '\\n');
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32603, message: error.message }
    };
    stdout.write(JSON.stringify(errorResponse) + '\\n');
  }
}

stdin.resume();
`;

    writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    return scriptPath;
  }

  getDirectCommand(): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  } {
    return this.generateCommand();
  }
}
