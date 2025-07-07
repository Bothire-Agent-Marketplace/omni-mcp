"use client";

import { useChat } from "ai/react";
import { useState, useEffect } from "react";

interface Provider {
  name: string;
  models: string[];
  isLocal: boolean;
  description: string;
}

interface ProvidersResponse {
  providers: Provider[];
  defaultProvider: string;
  defaultModel: string;
}

export default function Chat() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("qwen");
  const [selectedModel, setSelectedModel] = useState("qwen2.5-14b-instruct");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch("/api/chat");
        const data: ProvidersResponse = await response.json();
        setProviders(data.providers);
        setSelectedProvider(data.defaultProvider);
        setSelectedModel(data.defaultModel);
      } catch (error) {
        console.error("Failed to fetch providers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading,
  } = useChat({
    api: "/api/chat",
    body: {
      provider: selectedProvider,
      model: selectedModel,
    },
  });

  const currentProvider = providers.find((p) => p.name === selectedProvider);
  const availableModels = currentProvider?.models || [];

  // Get provider color based on type
  const getProviderColor = (provider: Provider) => {
    switch (provider.name) {
      case "qwen":
        return "bg-green-500";
      case "google":
        return "bg-red-500";
      case "openai":
        return "bg-blue-500";
      case "anthropic":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading AI providers...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header with Provider Selection */}
        <div className="border-b border-gray-200 p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Omni MCP Chat Assistant
          </h1>

          <div className="flex gap-4 flex-wrap">
            {/* Provider Selection */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                AI Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  const newProvider = providers.find(
                    (p) => p.name === e.target.value
                  );
                  if (newProvider && newProvider.models.length > 0) {
                    setSelectedModel(newProvider.models[0]);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {providers.map((provider) => (
                  <option key={provider.name} value={provider.name}>
                    {provider.name.charAt(0).toUpperCase() +
                      provider.name.slice(1)}{" "}
                    {provider.isLocal ? "(Local)" : "(Cloud)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Indicator */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentProvider
                      ? getProviderColor(currentProvider)
                      : "bg-gray-500"
                  }`}
                ></div>
                <span className="text-sm text-gray-600">
                  {currentProvider?.description || "AI Provider"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg">Welcome to Omni MCP Chat!</p>
              <p className="text-sm mt-2">
                Start a conversation with {selectedProvider} {selectedModel}.
              </p>
              {currentProvider && (
                <p className="text-xs mt-2 text-gray-600">
                  {currentProvider.description}
                </p>
              )}
              {currentProvider?.isLocal && (
                <p className="text-xs mt-1 text-green-600">
                  ✅ Using local LLM - no external API calls required
                </p>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.role === "user"
                      ? "You"
                      : `${selectedProvider}/${selectedModel}`}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))
          )}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="text-sm font-medium mb-1">
                  {selectedProvider}/{selectedModel}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={isChatLoading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChatLoading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
