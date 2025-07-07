import Chat from "@/components/chat";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Omni MCP Platform
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Multi-Provider AI Chat with Model Context Protocol Integration
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Qwen (Local LLM)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Google Gemini
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              OpenAI GPT
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Anthropic Claude
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              MCP Integration Ready
            </span>
          </div>
        </div>

        <Chat />

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This platform integrates multiple AI providers with MCP (Model
            Context Protocol) servers.
          </p>
          <p className="mt-1">
            Default: Qwen 2.5 14B Instruct • Switch providers in the chat
            interface above
          </p>
        </div>
      </div>
    </main>
  );
}
