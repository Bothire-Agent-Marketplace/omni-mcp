"use client";

import { useMcpTesting } from "@/hooks/use-mcp-testing";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
  MessageSquare,
  Activity,
  RefreshCw,
  Settings,
  Info,
  AlertTriangle,
} from "lucide-react";
import { type McpTestCapabilities } from "@/lib/services/testing.service";

// Types
interface Organization {
  id: string;
  clerkId: string;
  name: string;
}

interface OrganizationMembership extends Organization {
  role: string;
}

// Test data interfaces
interface TestFixtureItem {
  name?: string;
  uri?: string;
  description?: string;
  validArgs?: Record<string, unknown>;
}

// Remove duplicate types - using types from the hook instead

interface McpTestingViewProps {
  currentOrganization: Organization;
  availableOrganizations: OrganizationMembership[];
  initialCapabilities: McpTestCapabilities | null;
}

export function McpTestingView({
  currentOrganization,
  availableOrganizations,
  initialCapabilities,
}: McpTestingViewProps) {
  // Use the custom hook for all testing logic
  const {
    // State
    activeTab,
    setActiveTab,
    capabilities,
    isLoadingCapabilities,
    selectedOrganization,
    setSelectedOrganization,
    simulateContext,
    setSimulateContext,
    isTestRunning,
    lastTestResult,
    testHistory,
    testFixtures,
    testScenarios,
    isLoadingTestData,

    // Forms
    toolForm,
    setToolForm,
    promptForm,
    setPromptForm,
    resourceForm,
    setResourceForm,
    healthForm,
    setHealthForm,

    // Actions
    loadCapabilities,
    loadQuickPreset,
    loadTestData,
    handleToolTest,
    handlePromptTest,
    handleResourceTest,
    handleHealthTest,

    // Helpers
    formatResponseTime,
  } = useMcpTesting({
    currentOrganization,
    initialCapabilities,
  });

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            onClick={loadCapabilities}
            disabled={isLoadingCapabilities}
          >
            {isLoadingCapabilities ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Capabilities
          </Button>
        </div>
      </div>

      <Separator />

      {/* Quick Start Presets */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadQuickPreset("search")}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              AI Search Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadQuickPreset("debug")}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Browser Debug
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadQuickPreset("docs")}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Load Documentation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadQuickPreset("health")}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Health Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization Context Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Organization Context
          </CardTitle>
          <CardDescription>
            Configure the organization context for testing MCP operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Test Organization</Label>
              <Select
                value={selectedOrganization.clerkId}
                onValueChange={(clerkId) => {
                  const org = availableOrganizations.find(
                    (o) => o.clerkId === clerkId
                  );
                  if (org) {
                    setSelectedOrganization({
                      id: org.id,
                      clerkId: org.clerkId,
                      name: org.name,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOrganizations.map((org) => (
                    <SelectItem key={org.clerkId} value={org.clerkId}>
                      {org.name}{" "}
                      {org.clerkId === currentOrganization.clerkId &&
                        "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Context Mode</Label>
              <Select
                value={simulateContext ? "simulate" : "normal"}
                onValueChange={(value) =>
                  setSimulateContext(value === "simulate")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Context</SelectItem>
                  <SelectItem value="simulate">Simulate Context</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {simulateContext && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Context simulation allows testing with different organization
                contexts without switching your actual organization membership.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Testing Interface */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Operations Testing</CardTitle>
          <CardDescription>
            Test different MCP operations and view real-time results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Prompts
              </TabsTrigger>
              <TabsTrigger
                value="resources"
                className="flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Health
              </TabsTrigger>
              <TabsTrigger value="testdata" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Test Data
              </TabsTrigger>
            </TabsList>

            {/* Tool Testing */}
            <TabsContent value="tools" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tool-name">Tool Name</Label>
                    <Select
                      value={toolForm.name}
                      onValueChange={(value) =>
                        setToolForm((prev) => ({ ...prev, name: value }))
                      }
                    >
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
                      onChange={(e) =>
                        setToolForm((prev) => ({
                          ...prev,
                          arguments: e.target.value,
                        }))
                      }
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>

                  <Button
                    onClick={handleToolTest}
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
                          <div className="font-mono text-sm font-medium">
                            {tool.name}
                          </div>
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
            </TabsContent>

            {/* Prompt Testing */}
            <TabsContent value="prompts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt-name">Prompt Name</Label>
                    <Select
                      value={promptForm.name}
                      onValueChange={(value) =>
                        setPromptForm((prev) => ({ ...prev, name: value }))
                      }
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

                  <Button
                    onClick={handlePromptTest}
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
                        <div
                          key={prompt.name}
                          className="p-2 border rounded-lg"
                        >
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
            </TabsContent>

            {/* Resource Testing */}
            <TabsContent value="resources" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resource-uri">Resource URI</Label>
                    <Select
                      value={resourceForm.uri}
                      onValueChange={(value) =>
                        setResourceForm((prev) => ({ ...prev, uri: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resource to test" />
                      </SelectTrigger>
                      <SelectContent>
                        {capabilities?.resources.map((resource) => (
                          <SelectItem key={resource.uri} value={resource.uri}>
                            {resource.name || resource.uri}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleResourceTest}
                    disabled={!resourceForm.uri || isTestRunning}
                    className="w-full"
                  >
                    {isTestRunning ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Test Resource
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Available Resources</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isLoadingCapabilities ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading resources...
                      </div>
                    ) : capabilities?.resources.length ? (
                      capabilities.resources.map((resource) => (
                        <div
                          key={resource.uri}
                          className="p-2 border rounded-lg"
                        >
                          <div className="font-mono text-sm font-medium">
                            {resource.name || resource.uri}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {resource.uri}
                          </div>
                          {resource.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {resource.description}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No resources available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Health Testing */}
            <TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="health-target">Health Target</Label>
                    <Select
                      value={healthForm.target}
                      onValueChange={(value) =>
                        setHealthForm((prev) => ({ ...prev, target: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {capabilities?.healthTargets.map((target) => (
                          <SelectItem key={target} value={target}>
                            {target.charAt(0).toUpperCase() + target.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleHealthTest}
                    disabled={!healthForm.target || isTestRunning}
                    className="w-full"
                  >
                    {isTestRunning ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Check Health
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Health Targets</h4>
                  <div className="space-y-2">
                    {capabilities?.healthTargets.map((target) => (
                      <div
                        key={target}
                        className="flex items-center gap-2 p-2 border rounded-lg"
                      >
                        <Activity className="w-4 h-4" />
                        <span className="font-mono text-sm">
                          {target.charAt(0).toUpperCase() + target.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Test Data & Scenarios */}
            <TabsContent value="testdata" className="space-y-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Test Data & Scenarios</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => loadTestData("fixtures")}
                      disabled={isLoadingTestData}
                      size="sm"
                    >
                      {isLoadingTestData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Load Fixtures
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => loadTestData("scenarios")}
                      disabled={isLoadingTestData}
                      size="sm"
                    >
                      {isLoadingTestData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Load Scenarios
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Test Fixtures */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Test Fixtures</CardTitle>
                      <CardDescription>
                        Pre-built test data for tools, prompts, and resources
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {testFixtures ? (
                        <div className="space-y-4">
                          {Object.entries(
                            testFixtures as Record<string, TestFixtureItem[]>
                          ).map(([category, items]) => (
                            <div key={category} className="space-y-2">
                              <Label className="text-sm font-medium capitalize">
                                {category}
                              </Label>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {Array.isArray(items) &&
                                  items.map((item: TestFixtureItem, index) => (
                                    <div
                                      key={index}
                                      className="p-2 border rounded-lg text-sm"
                                    >
                                      <div className="font-mono">
                                        {item.name ||
                                          item.uri ||
                                          (typeof item === "string"
                                            ? item
                                            : "Unknown item")}
                                      </div>
                                      {item.description && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {item.description}
                                        </div>
                                      )}
                                      {item.validArgs && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="mt-1 h-6 px-2"
                                          onClick={() => {
                                            if (category === "tools") {
                                              setToolForm({
                                                name: item.name || "",
                                                arguments: JSON.stringify(
                                                  item.validArgs,
                                                  null,
                                                  2
                                                ),
                                              });
                                              setActiveTab("tools");
                                            } else if (category === "prompts") {
                                              setPromptForm({
                                                name: item.name || "",
                                              });
                                              setActiveTab("prompts");
                                            } else if (
                                              category === "resources"
                                            ) {
                                              setResourceForm({
                                                uri: item.uri || "",
                                              });
                                              setActiveTab("resources");
                                            }
                                          }}
                                        >
                                          Use Test Data
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>
                            Click &ldquo;Load Fixtures&rdquo; to see test data
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Test Scenarios */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Test Scenarios
                      </CardTitle>
                      <CardDescription>
                        Pre-built test scenarios and workflows
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {testScenarios.length > 0 ? (
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {testScenarios.map((scenario, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium text-sm">
                                    {scenario.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {scenario.description}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {scenario.complexity}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Steps:
                                </Label>
                                <div className="space-y-1">
                                  {scenario.steps?.map(
                                    (step, stepIndex: number) => (
                                      <div
                                        key={stepIndex}
                                        className="text-xs p-2 bg-muted rounded"
                                      >
                                        <span className="font-mono">
                                          {step.action}: {step.tool || "N/A"}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>
                            Click &ldquo;Load Scenarios&rdquo; to see test
                            scenarios
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Results */}
      {lastTestResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(lastTestResult.success)}
              Latest Test Result
            </CardTitle>
            <CardDescription>
              {lastTestResult.operation} operation on &ldquo;
              {lastTestResult.target}&rdquo;
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(lastTestResult.success)}
                  <Badge
                    variant={lastTestResult.success ? "default" : "destructive"}
                  >
                    {lastTestResult.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Response Time
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4" />
                  {formatResponseTime(lastTestResult.responseTime)}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Timestamp
                </Label>
                <div className="text-sm mt-1">
                  {new Date(lastTestResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Operation
                </Label>
                <div className="text-sm mt-1 font-mono">
                  {lastTestResult.operation}
                </div>
              </div>
            </div>

            {lastTestResult.error && (
              <Alert className="border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {lastTestResult.error}
                </AlertDescription>
              </Alert>
            )}

            {!!lastTestResult.result && (
              <div className="space-y-2">
                <Label>Response Data</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(lastTestResult.result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test History</CardTitle>
            <CardDescription>Recent test results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testHistory.map((result, index) => (
                <div
                  key={`${result.timestamp}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.success)}
                    <div>
                      <div className="text-sm font-medium">
                        {result.operation}: {result.target}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {formatResponseTime(result.responseTime)}
                    </Badge>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
