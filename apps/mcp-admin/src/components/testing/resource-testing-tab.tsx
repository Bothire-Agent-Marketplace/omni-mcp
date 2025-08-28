"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Loader2, Play, RefreshCw } from "lucide-react";
import type { McpTestCapabilities } from "@/lib/services/testing.service";

interface ResourceTestingTabProps {
  capabilities: McpTestCapabilities | null;
  isLoadingCapabilities: boolean;
  resourceForm: {uri: string;};
  onResourceFormChange: (form: {uri: string;}) => void;
  isTestRunning: boolean;
  onHandleResourceTest: (bypassCache: boolean) => void;
}

export function ResourceTestingTab({
  capabilities,
  isLoadingCapabilities,
  resourceForm,
  onResourceFormChange,
  isTestRunning,
  onHandleResourceTest
}: ResourceTestingTabProps) {
  const handleResourceUriChange = (value: string) => {
    onResourceFormChange({ uri: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resource-uri">Resource URI</Label>
          <Select
            value={resourceForm.uri}
            onValueChange={handleResourceUriChange}>

            <SelectTrigger>
              <SelectValue placeholder="Select a resource to test" />
            </SelectTrigger>
            <SelectContent>
              {capabilities?.resources.map((resource) =>
              <SelectItem key={resource.uri} value={resource.uri}>
                  {resource.name || resource.uri}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={!resourceForm.uri || isTestRunning}
              className="w-full">

              {isTestRunning ?
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

              <Play className="w-4 h-4 mr-2" />
              }
              Test Resource
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onHandleResourceTest(false)}>
              <Play className="w-4 h-4 mr-2" />
              Run Test (use cache)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHandleResourceTest(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Test (bypass cache)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Available Resources</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoadingCapabilities ?
          <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading resources...
            </div> :
          capabilities?.resources.length ?
          capabilities.resources.map((resource) =>
          <div key={resource.uri} className="p-2 border rounded-lg">
                <div className="font-mono text-sm font-medium">
                  {resource.name || resource.uri}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {resource.uri}
                </div>
                {resource.description &&
            <div className="text-xs text-muted-foreground mt-1">
                    {resource.description}
                  </div>
            }
              </div>
          ) :

          <div className="text-sm text-muted-foreground">
              No resources available
            </div>
          }
        </div>
      </div>
    </div>);

}