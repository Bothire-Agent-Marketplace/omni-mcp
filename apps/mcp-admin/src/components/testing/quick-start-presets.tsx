"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Zap, MessageSquare, Database, Activity } from "lucide-react";

interface QuickStartPresetsProps {
  onLoadPreset: (preset: "search" | "linear" | "devtools") => void;
}

export function QuickStartPresets({ onLoadPreset }: QuickStartPresetsProps) {
  const presets = [
  {
    id: "search" as const,
    label: "AI Search Test",
    icon: MessageSquare,
    description: "Test Perplexity search functionality"
  },
  {
    id: "linear" as const,
    label: "Linear Issues",
    icon: Database,
    description: "Test Linear issue search"
  },
  {
    id: "devtools" as const,
    label: "DevTools Test",
    icon: Activity,
    description: "Test Chrome DevTools integration"
  }];


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Start Presets
        </CardTitle>
        <CardDescription>
          Load common test scenarios with pre-filled parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            return (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => onLoadPreset(preset.id)}
                className="flex items-center gap-2"
                title={preset.description}>

                <Icon className="w-4 h-4" />
                {preset.label}
              </Button>);

          })}
        </div>
      </CardContent>
    </Card>);

}