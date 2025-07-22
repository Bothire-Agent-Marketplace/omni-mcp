"use client";

import { Label } from "@/components/ui/label";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface PerplexityResponse {
  id?: string;
  query?: string;
  answer: string;
  sources?: Array<{ title?: string; url?: string }>;
  timestamp?: string;
  model?: string;
}

interface ContentArrayResponse {
  content: Array<{ type: string; text: string }>;
}

interface AIResponseRendererProps {
  response: unknown;
  className?: string;
}

export function AIResponseRenderer({
  response,
  className,
}: AIResponseRendererProps) {
  // Parse JSON string if needed
  let parsedResponse = response;
  if (typeof response === "string") {
    try {
      parsedResponse = JSON.parse(response);
    } catch {
      // If parsing fails, treat as plain string
      parsedResponse = response;
    }
  }

  // Handle Perplexity-style responses
  if (
    parsedResponse &&
    typeof parsedResponse === "object" &&
    "answer" in parsedResponse
  ) {
    const perplexityResult = parsedResponse as PerplexityResponse;

    return (
      <div className={`space-y-4 ${className || ""}`}>
        {/* Main Answer */}
        <div className="p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
          <MarkdownRenderer content={perplexityResult.answer} />
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          {perplexityResult.model && (
            <div>
              <Label className="text-xs text-muted-foreground">Model</Label>
              <div className="text-sm font-mono">{perplexityResult.model}</div>
            </div>
          )}
          {perplexityResult.timestamp && (
            <div>
              <Label className="text-xs text-muted-foreground">Generated</Label>
              <div className="text-sm">
                {new Date(perplexityResult.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
          {perplexityResult.id && (
            <div>
              <Label className="text-xs text-muted-foreground">ID</Label>
              <div className="text-sm font-mono text-xs">
                {perplexityResult.id.slice(0, 8)}...
              </div>
            </div>
          )}
          {perplexityResult.query && (
            <div>
              <Label className="text-xs text-muted-foreground">Query</Label>
              <div className="text-sm truncate" title={perplexityResult.query}>
                {perplexityResult.query}
              </div>
            </div>
          )}
        </div>

        {/* Sources */}
        {perplexityResult.sources && perplexityResult.sources.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Sources</Label>
            <div className="space-y-2">
              {perplexityResult.sources.map((source, index) => (
                <div key={index} className="text-sm">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                    >
                      {source.title || source.url}
                    </a>
                  ) : (
                    <span>{source.title || `Source ${index + 1}`}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle content array responses (other AI providers)
  if (
    parsedResponse &&
    typeof parsedResponse === "object" &&
    "content" in parsedResponse
  ) {
    const content = (parsedResponse as ContentArrayResponse).content;
    if (Array.isArray(content) && content.length > 0) {
      const textContent = content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n\n");

      if (textContent) {
        // Try to parse the text content as JSON - it might be a Perplexity response
        try {
          const parsedTextContent = JSON.parse(textContent);

          // Check if the parsed content is a Perplexity response
          if (
            parsedTextContent &&
            typeof parsedTextContent === "object" &&
            "answer" in parsedTextContent
          ) {
            const perplexityResult = parsedTextContent as PerplexityResponse;

            return (
              <div className={`space-y-4 ${className || ""}`}>
                {/* Main Answer */}
                <div className="p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                  <MarkdownRenderer content={perplexityResult.answer} />
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  {perplexityResult.model && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Model
                      </Label>
                      <div className="text-sm font-mono">
                        {perplexityResult.model}
                      </div>
                    </div>
                  )}
                  {perplexityResult.timestamp && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Generated
                      </Label>
                      <div className="text-sm">
                        {new Date(
                          perplexityResult.timestamp
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                  {perplexityResult.id && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        ID
                      </Label>
                      <div className="text-sm font-mono text-xs">
                        {perplexityResult.id.slice(0, 8)}...
                      </div>
                    </div>
                  )}
                  {perplexityResult.query && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Query
                      </Label>
                      <div
                        className="text-sm truncate"
                        title={perplexityResult.query}
                      >
                        {perplexityResult.query}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sources */}
                {perplexityResult.sources &&
                  perplexityResult.sources.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Label className="text-sm font-medium mb-2 block">
                        Sources
                      </Label>
                      <div className="space-y-2">
                        {perplexityResult.sources.map((source, index) => (
                          <div key={index} className="text-sm">
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                              >
                                {source.title || source.url}
                              </a>
                            ) : (
                              <span>
                                {source.title || `Source ${index + 1}`}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            );
          }
        } catch {
          // If parsing fails, fall back to regular markdown rendering
        }

        return (
          <div
            className={`p-4 bg-muted rounded-lg max-h-96 overflow-y-auto ${className || ""}`}
          >
            <MarkdownRenderer content={textContent} />
          </div>
        );
      }
    }
  }

  // Handle string responses
  if (typeof parsedResponse === "string") {
    return (
      <div
        className={`p-4 bg-muted rounded-lg max-h-96 overflow-y-auto ${className || ""}`}
      >
        <MarkdownRenderer content={parsedResponse} />
      </div>
    );
  }

  // Fallback to JSON display for other types
  return (
    <div
      className={`p-4 bg-muted rounded-lg max-h-96 overflow-y-auto ${className || ""}`}
    >
      <pre className="text-sm whitespace-pre-wrap break-all">
        {JSON.stringify(parsedResponse, null, 2)}
      </pre>
    </div>
  );
}
