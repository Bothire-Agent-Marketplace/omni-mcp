"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, MessageSquare, Database, Activity } from "lucide-react";
import {
  ToolTestingTab,
  PromptTestingTab,
  ResourceTestingTab,
  HealthTestingTab } from
".";
import type { McpTestCapabilities } from "@/lib/services/testing.service";

interface TestingTabsProps {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  capabilities: McpTestCapabilities | null;
  isLoadingCapabilities: boolean;


  toolForm: {name: string;arguments: string;};
  onToolFormChange: (form: {name: string;arguments: string;}) => void;
  promptForm: {name: string;};
  onPromptFormChange: (form: {name: string;}) => void;
  resourceForm: {uri: string;};
  onResourceFormChange: (form: {uri: string;}) => void;
  healthForm: {target: string;};
  onHealthFormChange: (form: {target: string;}) => void;


  isTestRunning: boolean;
  onHandleToolTest: (bypassCache: boolean) => void;
  onHandlePromptTest: (bypassCache: boolean) => void;
  onHandleResourceTest: (bypassCache: boolean) => void;
  onHandleHealthTest: (bypassCache: boolean) => void;


  onGetDefaultArgsForTool: (toolName: string) => object;
}

export function TestingTabs({
  activeTab,
  onActiveTabChange,
  capabilities,
  isLoadingCapabilities,
  toolForm,
  onToolFormChange,
  promptForm,
  onPromptFormChange,
  resourceForm,
  onResourceFormChange,
  healthForm,
  onHealthFormChange,
  isTestRunning,
  onHandleToolTest,
  onHandlePromptTest,
  onHandleResourceTest,
  onHandleHealthTest,
  onGetDefaultArgsForTool
}: TestingTabsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Operations Testing</CardTitle>
        <CardDescription>
          Test different MCP operations and view real-time results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={onActiveTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="space-y-4">
            <ToolTestingTab
              capabilities={capabilities}
              isLoadingCapabilities={isLoadingCapabilities}
              toolForm={toolForm}
              onToolFormChange={onToolFormChange}
              isTestRunning={isTestRunning}
              onHandleToolTest={onHandleToolTest}
              onGetDefaultArgsForTool={onGetDefaultArgsForTool} />

          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            <PromptTestingTab
              capabilities={capabilities}
              isLoadingCapabilities={isLoadingCapabilities}
              promptForm={promptForm}
              onPromptFormChange={onPromptFormChange}
              isTestRunning={isTestRunning}
              onHandlePromptTest={onHandlePromptTest} />

          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <ResourceTestingTab
              capabilities={capabilities}
              isLoadingCapabilities={isLoadingCapabilities}
              resourceForm={resourceForm}
              onResourceFormChange={onResourceFormChange}
              isTestRunning={isTestRunning}
              onHandleResourceTest={onHandleResourceTest} />

          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <HealthTestingTab
              capabilities={capabilities}
              healthForm={healthForm}
              onHealthFormChange={onHealthFormChange}
              isTestRunning={isTestRunning}
              onHandleHealthTest={onHandleHealthTest} />

          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>);

}