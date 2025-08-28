"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function CopyButton({
  text,
  className,
  size = "icon"
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={copyToClipboard}
      className={cn(
        "h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        className
      )}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}>

      {copied ?
      <Check className="h-4 w-4 text-green-600" /> :

      <Copy className="h-4 w-4" />
      }
    </Button>);

}