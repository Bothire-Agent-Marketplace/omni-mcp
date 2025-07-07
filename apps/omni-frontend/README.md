# Omni MCP Frontend

A Next.js frontend for the Omni MCP (Model Context Protocol) platform with multi-provider AI chat
capabilities.

## Features

- 🤖 **Multi-Provider AI Chat**: Support for 4 AI providers
  - **Qwen 3** (Alibaba Cloud) - Advanced reasoning, tool calling, multilingual
  - **Google Gemini** - Advanced multimodal AI
  - **OpenAI GPT** - Industry leading models
  - **Anthropic Claude** - Excellent reasoning

- 🔌 **MCP Integration**: Ready to connect with MCP servers
  - Linear (5 tools) - Issue management, team coordination
  - Perplexity (4 tools) - Web search, research automation
  - DevTools (40 tools) - Browser automation, debugging

- 🏠 **Local & Cloud Models**: Choose between local privacy and cloud power
- 📱 **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- ⚡ **Real-time Streaming**: Powered by Vercel AI SDK

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables (Optional)

Copy the example environment file:

```bash
cp .env.example .env.local
```

Add your API keys for cloud providers (leave commented for local-only usage):

```bash
# Qwen 3 (Alibaba Cloud)
DASHSCOPE_API_KEY=your_dashscope_api_key_here

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# OpenAI GPT
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to start chatting!

## AI Provider Setup

### Qwen 3 (Default)

**Cloud Models** (requires DASHSCOPE_API_KEY):

- `qwen2.5-14b-instruct` - 14B with tool calling (default)
- `qwen2.5-8b-instruct` - 8B with tool calling
- `qwen2.5-72b-instruct` - 72B large model
- `qwen2.5-7b-instruct` - 7B base model

**Local Models** (via Ollama, no API key needed):

- `qwen2.5-coder-7b` - Local coding specialist

Get your Qwen API key: [DashScope Console](https://dashscope.console.aliyun.com/)

### Google Gemini

Models available:

- `gemini-2.5-ultra` - Most powerful
- `gemini-2.5-pro` - Balanced performance
- `gemini-2.5-flash` - Fast responses
- `gemini-2.5-flash-lite` - Lightweight

Get your API key: [Google AI Studio](https://aistudio.google.com/app/apikey)

### OpenAI GPT

Models available:

- `gpt-4.5` - Most advanced
- `gpt-4.5-turbo` - Fast, high context
- `gpt-4.5-flash` - Fastest, cost-effective
- `gpt-3.5-turbo` - Legacy, cost-sensitive

Get your API key: [OpenAI Platform](https://platform.openai.com/api-keys)

### Anthropic Claude

Models available:

- `claude-4-opus` - Most powerful, deep reasoning
- `claude-4-sonnet` - Balanced, fast, strong reasoning
- `claude-4-haiku` - Fastest, lowest cost

Get your API key: [Anthropic Console](https://console.anthropic.com/)

## Local Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm type-check   # TypeScript type checking
```

### Project Structure

```
src/
├── app/
│   ├── api/chat/     # Chat API endpoint
│   ├── globals.css   # Global styles
│   └── page.tsx      # Main page
├── components/
│   └── chat.tsx      # Chat interface
└── ...
```

## MCP Integration

The frontend is designed to work with the Omni MCP gateway that provides access to:

- **Linear Tools**: Issue management, team coordination
- **Perplexity Tools**: Web search, research automation
- **DevTools**: Browser automation, debugging capabilities

Gateway endpoint: `http://localhost:37373`

## API Reference

### Chat API

**Endpoint**: `POST /api/chat`

**Request Body**:

```json
{
  "messages": [{ "role": "user", "content": "Hello!" }],
  "provider": "qwen",
  "model": "qwen2.5-14b-instruct"
}
```

**Response**: Streaming text response

### Providers API

**Endpoint**: `GET /api/chat`

**Response**:

```json
{
  "providers": [...],
  "defaultProvider": "qwen",
  "defaultModel": "qwen2.5-14b-instruct",
  "environmentVariables": {...}
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the Omni MCP platform. See the main repository for license information.
