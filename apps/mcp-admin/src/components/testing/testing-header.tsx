"use client";

import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { testingService } from "@/lib/services/testing.service";

interface TestingHeaderProps {
  isLoadingCapabilities: boolean;
  onRefreshCapabilities: () => void;
}

export function TestingHeader({
  isLoadingCapabilities,
  onRefreshCapabilities
}: TestingHeaderProps) {
  const handleClearCache = () => {
    testingService.clearCache();
    toast.success("Cache cleared successfully");
  };

  return (
    <div className="space-y-6">
      {}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">MCP Testing Interface</h3>
          <p className="text-sm text-muted-foreground">
            Test MCP servers, tools, prompts, and resources with organization
            context simulation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onRefreshCapabilities}
            disabled={isLoadingCapabilities}>

            {isLoadingCapabilities ?
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

            <RefreshCw className="w-4 h-4 mr-2" />
            }
            Refresh Capabilities
          </Button>
          <Button variant="outline" onClick={handleClearCache} size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      <Separator />
    </div>);

}