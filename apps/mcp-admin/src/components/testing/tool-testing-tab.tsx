"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface ToolTestingTabProps {
  capabilities: McpTestCapabilities | null;
  isLoadingCapabilities: boolean;
  toolForm: { name: string; arguments: string };
  onToolFormChange: (form: { name: string; arguments: string }) => void;
  isTestRunning: boolean;
  onHandleToolTest: (bypassCache: boolean) => void;
  onGetDefaultArgsForTool: (toolName: string) => object;
}

export function ToolTestingTab({
  capabilities,
  isLoadingCapabilities,
  toolForm,
  onToolFormChange,
  isTestRunning,
  onHandleToolTest,
  onGetDefaultArgsForTool,
}: ToolTestingTabProps) {
  const handleToolNameChange = (value: string) => {
    const defaultArgs = onGetDefaultArgsForTool(value);
    onToolFormChange({
      name: value,
      arguments: JSON.stringify(defaultArgs, null, 2),
    });
  };

  const handleArgumentsChange = (value: string) => {
    onToolFormChange({
      ...toolForm,
      arguments: value,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tool-name">Tool Name</Label>
          <Select value={toolForm.name} onValueChange={handleToolNameChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tool to test" />
            </SelectTrigger>
            <SelectContent>
              {capabilities?.tools.map((tool) => (
                <SelectItem key={tool.name} value={tool.name}>
                  {tool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-arguments">Arguments (JSON)</Label>
          <Textarea
            id="tool-arguments"
            value={toolForm.arguments}
            onChange={(e) => handleArgumentsChange(e.target.value)}
            placeholder='{"key": "value"}'
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={!toolForm.name || isTestRunning}
              className="w-full"
            >
              {isTestRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Test Tool
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onHandleToolTest(false)}>
              <Play className="w-4 h-4 mr-2" />
              Run Test (use cache)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHandleToolTest(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Test (bypass cache)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Available Tools</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoadingCapabilities ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading tools...
            </div>
          ) : capabilities?.tools.length ? (
            capabilities.tools.map((tool) => (
              <div key={tool.name} className="p-2 border rounded-lg">
                <div className="font-mono text-sm font-medium">{tool.name}</div>
                {tool.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {tool.description}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              No tools available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
