"use client";

import type { Organization } from "@mcp/database/client";
import {
  TestingHeader,
  QuickStartPresets,
  OrganizationContextSelector,
  TestingTabs,
  TestResultsDisplay,
  TestHistoryDisplay } from
"@/components/testing";
import { useMcpTesting } from "@/hooks/use-mcp-testing";
import type { McpTestCapabilities } from "@/lib/services/testing.service";

interface McpTestingViewProps {
  currentOrganization: Organization;

  availableOrganizations: (Organization & {role: string;})[];
  initialCapabilities: McpTestCapabilities | null;
}

export function McpTestingView({
  currentOrganization,
  availableOrganizations,
  initialCapabilities
}: McpTestingViewProps) {

  const {

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


    toolForm,
    setToolForm,
    promptForm,
    setPromptForm,
    resourceForm,
    setResourceForm,
    healthForm,
    setHealthForm,


    loadCapabilities,
    loadQuickPreset,
    handleToolTest,
    handlePromptTest,
    handleResourceTest,
    handleHealthTest,


    formatResponseTime,
    getDefaultArgsForTool
  } = useMcpTesting({
    currentOrganization,
    initialCapabilities
  });

  return (
    <div className="space-y-6">
      <TestingHeader
        isLoadingCapabilities={isLoadingCapabilities}
        onRefreshCapabilities={loadCapabilities} />


      <QuickStartPresets onLoadPreset={loadQuickPreset} />

      <OrganizationContextSelector
        currentOrganization={currentOrganization}
        availableOrganizations={availableOrganizations}
        selectedOrganization={selectedOrganization}
        onSelectedOrganizationChange={(org) => setSelectedOrganization(org)}
        simulateContext={simulateContext}
        onSimulateContextChange={setSimulateContext} />


      <TestingTabs
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        capabilities={capabilities}
        isLoadingCapabilities={isLoadingCapabilities}
        toolForm={toolForm}
        onToolFormChange={setToolForm}
        promptForm={promptForm}
        onPromptFormChange={setPromptForm}
        resourceForm={resourceForm}
        onResourceFormChange={setResourceForm}
        healthForm={healthForm}
        onHealthFormChange={setHealthForm}
        isTestRunning={isTestRunning}
        onHandleToolTest={handleToolTest}
        onHandlePromptTest={handlePromptTest}
        onHandleResourceTest={handleResourceTest}
        onHandleHealthTest={handleHealthTest}
        onGetDefaultArgsForTool={getDefaultArgsForTool} />


      {lastTestResult &&
      <TestResultsDisplay
        lastTestResult={lastTestResult}
        formatResponseTime={formatResponseTime} />

      }

      <TestHistoryDisplay
        testHistory={testHistory}
        formatResponseTime={formatResponseTime} />

    </div>);

}