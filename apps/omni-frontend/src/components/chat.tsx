"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";

export default function Chat() {
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [enableTools, setEnableTools] = useState(true);
  const [toolsStatus, setToolsStatus] = useState<any>(null);

  // Fetch tools status on component mount
  useEffect(() => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => setToolsStatus(data))
      .catch((err) => console.error("Failed to fetch tools status:", err));
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      body: {
        provider,
        model,
        enableTools,
      },
      maxSteps: 5,
    });

  const toolsConnected = toolsStatus?.gateway?.connected || false;
  const toolsCount = toolsStatus?.tools?.available || 0;

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header with controls */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Omni MCP Chat</h1>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableTools}
                onChange={(e) => setEnableTools(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable MCP Tools</span>
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded border-gray-300 text-sm focus:ring-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded border-gray-300 text-sm focus:ring-blue-500"
            >
              {provider === "openai" && (
                <>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
              {provider === "anthropic" && (
                <>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </>
              )}
              {provider === "google" && (
                <>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Tool status display */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {enableTools && toolsConnected && (
              <div className="text-sm text-green-600">
                🔧 MCP Tools: {toolsCount} tools active
                <span className="ml-2 text-xs bg-green-100 px-2 py-1 rounded">
                  Linear ({toolsStatus.tools.categories.linear}) | Perplexity (
                  {toolsStatus.tools.categories.perplexity}) | DevTools (
                  {toolsStatus.tools.categories.devtools})
                </span>
              </div>
            )}
            {enableTools && !toolsConnected && (
              <div className="text-sm text-yellow-600">
                ⚠️ MCP Gateway: {toolsStatus?.tools?.status || "Connecting..."}
              </div>
            )}
            {!enableTools && (
              <div className="text-sm text-gray-500">
                💬 Text-only mode active
              </div>
            )}
          </div>

          {toolsStatus?.gateway && (
            <div className="text-xs text-gray-400">
              Gateway: {toolsStatus.gateway.url}
            </div>
          )}
        </div>
      </div>

      {/* Messages Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <h2 className="text-xl font-semibold mb-2">
              Welcome to Omni MCP Chat!
            </h2>
            <p className="mb-4">
              {toolsConnected
                ? `I have access to ${toolsCount} MCP tools and can help you with:`
                : "I'm a helpful AI assistant. Once the MCP gateway connects, I'll have access to powerful tools!"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div
                className={`border rounded-lg p-4 ${toolsStatus?.tools?.categories.linear > 0 ? "bg-blue-50 border-blue-200" : ""}`}
              >
                <h3 className="font-semibold text-blue-600">📋 Linear</h3>
                <p className="text-sm">
                  Manage issues, search projects, track team progress
                </p>
                {toolsStatus?.tools?.categories.linear > 0 && (
                  <div className="text-xs text-blue-500 mt-1">
                    {toolsStatus.tools.categories.linear} tools available
                  </div>
                )}
              </div>
              <div
                className={`border rounded-lg p-4 ${toolsStatus?.tools?.categories.perplexity > 0 ? "bg-purple-50 border-purple-200" : ""}`}
              >
                <h3 className="font-semibold text-purple-600">🔍 Perplexity</h3>
                <p className="text-sm">
                  Web search, research, real-time information
                </p>
                {toolsStatus?.tools?.categories.perplexity > 0 && (
                  <div className="text-xs text-purple-500 mt-1">
                    {toolsStatus.tools.categories.perplexity} tools available
                  </div>
                )}
              </div>
              <div
                className={`border rounded-lg p-4 ${toolsStatus?.tools?.categories.devtools > 0 ? "bg-orange-50 border-orange-200" : ""}`}
              >
                <h3 className="font-semibold text-orange-600">🛠️ DevTools</h3>
                <p className="text-sm">
                  Browser automation, debugging, screenshots
                </p>
                {toolsStatus?.tools?.categories.devtools > 0 && (
                  <div className="text-xs text-orange-500 mt-1">
                    {toolsStatus.tools.categories.devtools} tools available
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Try asking: "Search for information about Next.js 15" or "Help me
              find Linear issues"
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="font-semibold text-xs mb-1 opacity-70">
                {message.role === "user" ? "You" : `AI (${provider})`}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-semibold">Error</div>
            <div className="text-red-600 text-sm mt-1">{error.message}</div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={
              toolsConnected
                ? "Ask me anything... I can search the web, manage Linear issues, or automate browsers!"
                : "Ask me anything... (MCP tools will be available once gateway connects)"
            }
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>
        <div className="text-xs text-gray-500 mt-2 text-center">
          Powered by {provider} •{" "}
          {enableTools
            ? toolsConnected
              ? `${toolsCount} MCP Tools Active`
              : "Connecting to MCP Gateway..."
            : "Text Only Mode"}
        </div>
      </div>
    </div>
  );
}
