"use client";

import { useMcpTesting } from "@/hooks/use-mcp-testing";
import {
  TestingHeader,
  QuickStartPresets,
  OrganizationContextSelector,
  TestingTabs,
  TestResultsDisplay,
  TestHistoryDisplay,
} from "@/components/testing";
import type { McpTestCapabilities } from "@/lib/services/testing.service";

// Types
interface Organization {
  id: string;
  clerkId: string;
  name: string;
}

interface OrganizationMembership extends Organization {
  role: string;
}

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
    handleToolTest,
    handlePromptTest,
    handleResourceTest,
    handleHealthTest,

    // Helpers
    formatResponseTime,
    getDefaultArgsForTool,
  } = useMcpTesting({
    currentOrganization,
    initialCapabilities,
  });

  return (
    <div className="space-y-6">
      <TestingHeader
        isLoadingCapabilities={isLoadingCapabilities}
        onRefreshCapabilities={loadCapabilities}
      />

      <QuickStartPresets onLoadPreset={loadQuickPreset} />

      <OrganizationContextSelector
        currentOrganization={currentOrganization}
        availableOrganizations={availableOrganizations}
        selectedOrganization={selectedOrganization}
        onSelectedOrganizationChange={setSelectedOrganization}
        simulateContext={simulateContext}
        onSimulateContextChange={setSimulateContext}
      />

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
        onGetDefaultArgsForTool={getDefaultArgsForTool}
      />

      {lastTestResult && (
        <TestResultsDisplay
          lastTestResult={lastTestResult}
          formatResponseTime={formatResponseTime}
        />
      )}

      <TestHistoryDisplay
        testHistory={testHistory}
        formatResponseTime={formatResponseTime}
      />
    </div>
  );
}
