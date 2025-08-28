"use client";

import dynamic from "next/dynamic";
import { Highlight, themes } from "prism-react-renderer";
import { useEffect } from "react";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { CopyButton } from "@/components/chat/copy-button";
import { cn } from "@/lib/utils";


const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className
}: MarkdownRendererProps) {

  useEffect(() => {
    const loadLanguages = async () => {

      await import("prismjs");



      await import("prismjs/components/prism-bash");

      await import("prismjs/components/prism-diff");

      await import("prismjs/components/prism-json");

      await import("prismjs/components/prism-python");

      await import("prismjs/components/prism-typescript");

      await import("prismjs/components/prism-jsx");

      await import("prismjs/components/prism-tsx");

      await import("prismjs/components/prism-yaml");
    };

    loadLanguages().catch(console.error);
  }, []);

  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert prose-pre:my-2 max-w-none",
        className
      )}>

      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const isInline = !match && !className;

            if (isInline) {
              return (
                <code className="bg-muted rounded-sm px-1 py-0.5" {...props}>
                  {children}
                </code>);

            }

            const codeText = String(children).replace(/\n$/, "");

            return (
              <div className="relative my-4 overflow-hidden rounded-md">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={codeText} />
                </div>
                <Highlight
                  theme={themes.vsDark}
                  code={codeText}
                  language={language || "text"}>

                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps
                  }) =>
                  <pre
                    className={cn(
                      className,
                      "relative overflow-x-auto rounded-md p-4 text-sm",
                      "border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                    )}
                    style={{
                      ...style,
                      backgroundColor: "var(--code-bg)",
                      color: "var(--code-fg)"
                    }}>

                      {tokens.map((line, i) =>
                    <div
                      key={i}
                      {...getLineProps({ line, key: i })}
                      className="table-row">

                          <span className="table-cell w-12 pr-4 text-right text-gray-500 select-none dark:text-gray-400">
                            {i + 1}
                          </span>
                          <span className="table-cell">
                            {line.map((token, tokenIndex) => {
                          const tokenProps = getTokenProps({
                            token,
                            key: tokenIndex
                          });

                          const { key: _key, ...restTokenProps } =
                          tokenProps;
                          return (
                            <span key={tokenIndex} {...restTokenProps} />);

                        })}
                          </span>
                        </div>
                    )}
                    </pre>
                  }
                </Highlight>
              </div>);

          },

          table: ({ ...props }) =>
          <table
            className="my-4 w-full border-collapse border border-gray-200 dark:border-gray-700"
            {...props} />,


          thead: ({ ...props }) =>
          <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,

          th: ({ ...props }) =>
          <th
            className="p-2 text-left text-xs font-medium uppercase dark:text-gray-300"
            {...props} />,


          tr: ({ ...props }) =>
          <tr
            className="border-t border-gray-200 even:bg-gray-50 dark:border-gray-700 even:dark:bg-gray-800/50"
            {...props} />,


          td: ({ ...props }) => <td className="p-2 text-sm" {...props} />,

          ul: ({ ...props }) =>
          <ul className="mb-4 list-disc space-y-1 pl-6" {...props} />,

          ol: ({ ...props }) =>
          <ol className="mb-4 list-decimal space-y-1 pl-6" {...props} />,


          blockquote: ({ ...props }) =>
          <blockquote
            className="border-primary/30 border-l-4 pl-4 text-gray-700 italic dark:text-gray-300"
            {...props} />,



          h1: ({ ...props }) =>
          <h1
            className="mt-6 mb-3 border-b border-gray-200 pb-1 text-2xl font-bold dark:border-gray-700"
            {...props} />,


          h2: ({ ...props }) =>
          <h2
            className="mt-5 mb-2 border-b border-gray-200 pb-1 text-xl font-bold dark:border-gray-700"
            {...props} />,


          h3: ({ ...props }) =>
          <h3 className="mt-4 mb-2 text-lg font-bold" {...props} />,

          h4: ({ ...props }) =>
          <h4 className="mt-3 mb-1 text-base font-bold" {...props} />,


          p: ({ ...props }) =>
          <p className="mb-4 leading-relaxed" {...props} />

        }}>

        {content}
      </ReactMarkdown>
    </div>);

}