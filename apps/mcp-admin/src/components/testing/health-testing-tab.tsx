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
import { Loader2, Play, RefreshCw, Activity } from "lucide-react";
import type { McpTestCapabilities } from "@/lib/services/testing.service";

interface HealthTestingTabProps {
  capabilities: McpTestCapabilities | null;
  healthForm: {target: string;};
  onHealthFormChange: (form: {target: string;}) => void;
  isTestRunning: boolean;
  onHandleHealthTest: (bypassCache: boolean) => void;
}

export function HealthTestingTab({
  capabilities,
  healthForm,
  onHealthFormChange,
  isTestRunning,
  onHandleHealthTest
}: HealthTestingTabProps) {
  const handleHealthTargetChange = (value: string) => {
    onHealthFormChange({ target: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="health-target">Health Target</Label>
          <Select
            value={healthForm.target}
            onValueChange={handleHealthTargetChange}>

            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {capabilities?.healthTargets.map((target) =>
              <SelectItem key={target} value={target}>
                  {target.charAt(0).toUpperCase() + target.slice(1)}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={!healthForm.target || isTestRunning}
              className="w-full">

              {isTestRunning ?
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

              <Play className="w-4 h-4 mr-2" />
              }
              Check Health
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onHandleHealthTest(false)}>
              <Play className="w-4 h-4 mr-2" />
              Run Test (use cache)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHandleHealthTest(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Test (bypass cache)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Health Targets</h4>
        <div className="space-y-2">
          {capabilities?.healthTargets.map((target) =>
          <div
            key={target}
            className="flex items-center gap-2 p-2 border rounded-lg">

              <Activity className="w-4 h-4" />
              <span className="font-mono text-sm">
                {target.charAt(0).toUpperCase() + target.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>);

}