"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Play, RefreshCw } from "lucide-react";
import type { McpTestCapabilities } from "@/lib/services/testing.service";

interface PromptTestingTabProps {
  capabilities: McpTestCapabilities | null;
  isLoadingCapabilities: boolean;
  promptForm: { name: string };
  onPromptFormChange: (form: { name: string }) => void;
  isTestRunning: boolean;
  onHandlePromptTest: (bypassCache: boolean) => void;
}

export function PromptTestingTab({
  capabilities,
  isLoadingCapabilities,
  promptForm,
  onPromptFormChange,
  isTestRunning,
  onHandlePromptTest,
}: PromptTestingTabProps) {
  const handlePromptNameChange = (value: string) => {
    onPromptFormChange({ name: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-name">Prompt Name</Label>
          <Select
            value={promptForm.name}
            onValueChange={handlePromptNameChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a prompt to test" />
            </SelectTrigger>
            <SelectContent>
              {capabilities?.prompts.map((prompt) => (
                <SelectItem key={prompt.name} value={prompt.name}>
                  {prompt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={!promptForm.name || isTestRunning}
              className="w-full"
            >
              {isTestRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Test Prompt
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onHandlePromptTest(false)}>
              <Play className="w-4 h-4 mr-2" />
              Run Test (use cache)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHandlePromptTest(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Test (bypass cache)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Available Prompts</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoadingCapabilities ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading prompts...
            </div>
          ) : capabilities?.prompts.length ? (
            capabilities.prompts.map((prompt) => (
              <div key={prompt.name} className="p-2 border rounded-lg">
                <div className="font-mono text-sm font-medium">
                  {prompt.name}
                </div>
                {prompt.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {prompt.description}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              No prompts available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
