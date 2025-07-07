# Model Reference: Gemini, Anthropic, and OpenAI (June 2025)

## Gemini (Google)

| Model Name            | Model ID for Code              | Use Cases                                           | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Context Window |
| --------------------- | ------------------------------ | --------------------------------------------------- | -------------------------- | --------------------------- | -------------- |
| Gemini 2.5 Ultra      | `gemini-2.5-ultra-latest`      | Most powerful, research, advanced reasoning, coding | $2.50                      | $20.00                      | 1M tokens      |
| Gemini 2.5 Pro        | `gemini-2.5-pro-latest`        | Complex tasks, coding, analysis, general chat       | $1.25                      | $10.00                      | 1M tokens      |
| Gemini 2.5 Flash      | `gemini-2.5-flash-latest`      | Fast, real-time, high-throughput, chat, search      | $0.30                      | $2.50                       | 1M tokens      |
| Gemini 2.5 Flash Lite | `gemini-2.5-flash-lite-latest` | Lightweight, cost-sensitive, simple chat or search  | $0.10                      | $0.40                       | 1M tokens      |

---

## Anthropic (Claude)

| Model Name      | Model ID for Code        | Use Cases                                        | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Context Window |
| --------------- | ------------------------ | ------------------------------------------------ | -------------------------- | --------------------------- | -------------- |
| Claude 4 Opus   | `claude-4-opus-202505`   | Most powerful, deep reasoning, long context      | $8.00                      | $40.00                      | 1M tokens      |
| Claude 4 Sonnet | `claude-4-sonnet-202505` | Balanced, fast, strong reasoning                 | $2.00                      | $10.00                      | 1M tokens      |
| Claude 4 Haiku  | `claude-4-haiku-202505`  | Fastest, lowest cost, simple chat, summarization | $0.15                      | $0.75                       | 1M tokens      |

---

## OpenAI (GPT)

| Model Name             | Model ID for Code | Use Cases                                   | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Context Window |
| ---------------------- | ----------------- | ------------------------------------------- | -------------------------- | --------------------------- | -------------- |
| GPT-4.5                | `gpt-4.5`         | Most advanced, multimodal, coding, chat     | $4.00                      | $12.00                      | 256k tokens    |
| GPT-4.5 Turbo          | `gpt-4.5-turbo`   | Fast, high context, general tasks           | $8.00                      | $24.00                      | 256k tokens    |
| GPT-4.5 Flash          | `gpt-4.5-flash`   | Fastest, cost-effective, simple chat/search | $1.00                      | $3.00                       | 256k tokens    |
| GPT-3.5 Turbo (legacy) | `gpt-3.5-turbo`   | Legacy, basic chat, cost-sensitive          | $0.40                      | $1.20                       | 16k tokens     |

---

## Ollama (Local Models)

| Model Name      | Model ID for Code  | Parameters | Use Cases                                        | Memory Usage | Speed     | Context Window |
| --------------- | ------------------ | ---------- | ------------------------------------------------ | ------------ | --------- | -------------- |
| Qwen 2.5 Coder  | `qwen2.5-coder:7b` | 7B         | **Document processing, code, structured text**   | ~4GB         | Fast      | 32k tokens     |
| Llama 3.1       | `llama3.1:8b`      | 8B         | General purpose, chat, document enhancement      | ~5GB         | Fast      | 128k tokens    |
| Mistral         | `mistral:7b`       | 7B         | Fast reasoning, multilingual, efficient          | ~4GB         | Very Fast | 32k tokens     |
| Phi-3           | `phi3:3.8b`        | 3.8B       | Lightweight, fast responses, simple tasks        | ~2.5GB       | Very Fast | 128k tokens    |
| CodeLlama       | `codellama:7b`     | 7B         | Code generation, programming tasks               | ~4GB         | Fast      | 16k tokens     |
| Llama 3.1 Large | `llama3.1:70b`     | 70B        | Most capable, complex reasoning (requires 32GB+) | ~40GB        | Slower    | 128k tokens    |

### **Ollama Benefits**

- ✅ **Free**: No API costs
- ✅ **Private**: Data stays local
- ✅ **Fast**: No network latency
- ✅ **Offline**: Works without internet
- ✅ **Consistent**: No rate limits

### **Installation & Usage**

```bash
# Install Ollama
brew install ollama

# Start service
brew services start ollama

# Download a model
ollama pull qwen2.5-coder:7b

# Test the model
ollama run qwen2.5-coder:7b "Enhance this document title"
```

### **Recommended for Migration Tool**

- **Primary**: `qwen2.5-coder:7b` - Best for document processing
- **Alternative**: `llama3.1:8b` - Good general purpose option
- **Lightweight**: `phi3:3.8b` - If you have limited RAM

---

## Notes

- **Model IDs**: Use the "Model ID for Code" column in your API calls (`-latest` or versioned).
- **Costs**: All prices are per 1M tokens (June 2025, USD, rounded, check official docs for latest).
- **Context Window**: Maximum tokens per request (input + output).
- **Use Cases**:
  - **Ultra/Opus/4.5o**: Best for complex, high-value tasks.
  - **Flash/Haiku/Flash**: Best for fast, cost-sensitive, or high-throughput needs.

---

**References:**

- [Google Gemini Pricing](https://ai.google.dev/pricing)
- [Anthropic Claude Pricing](https://docs.anthropic.com/claude/docs/models-overview)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Ollama Models Library](https://ollama.com/library)
- [Ollama Documentation](https://github.com/ollama/ollama)
