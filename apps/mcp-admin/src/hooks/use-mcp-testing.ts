import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  testingService,
  type McpTestCapabilities,
  type McpTestResult,
} from "@/lib/services/testing.service";

interface Organization {
  id: string;
  clerkId: string;
  name: string;
}

interface TestFixtureItem {
  name?: string;
  uri?: string;
  description?: string;
  validArgs?: Record<string, unknown>;
}

interface TestScenario {
  name: string;
  description: string;
  steps: Array<{
    action: string;
    tool?: string;
    args?: Record<string, unknown>;
    expectSuccess?: boolean;
    in?: string;
  }>;
  complexity: "simple" | "moderate" | "complex";
}

interface UseMcpTestingProps {
  currentOrganization: Organization;
  initialCapabilities: McpTestCapabilities | null;
}

export function useMcpTesting({
  currentOrganization,
  initialCapabilities,
}: UseMcpTestingProps) {
  // State management
  const [activeTab, setActiveTab] = useState("tools");
  const [capabilities, setCapabilities] = useState<McpTestCapabilities | null>(
    initialCapabilities
  );
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization>(currentOrganization);
  const [simulateContext, setSimulateContext] = useState(false);

  // Test state
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<McpTestResult | null>(
    null
  );
  const [testHistory, setTestHistory] = useState<McpTestResult[]>([]);

  // Test data state
  const [testFixtures, setTestFixtures] = useState<Record<
    string,
    TestFixtureItem[]
  > | null>(null);
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([]);
  const [isLoadingTestData, setIsLoadingTestData] = useState(false);

  // Form state with defaults
  const [toolForm, setToolForm] = useState({
    name: "perplexity_search",
    arguments: JSON.stringify(
      {
        query: "What is MCP (Model Context Protocol)?",
        model: "sonar-pro",
      },
      null,
      2
    ),
  });

  const [promptForm, setPromptForm] = useState({
    name: "code_review",
  });

  const [resourceForm, setResourceForm] = useState({
    uri: "https://jsonplaceholder.typicode.com/posts/1",
  });

  const [healthForm, setHealthForm] = useState({
    target: "gateway",
  });

  // Default arguments for different tools
  const getDefaultArgsForTool = (toolName: string) => {
    const defaultArgs: Record<string, unknown> = {
      perplexity_search: {
        query: "What is MCP (Model Context Protocol)?",
        model: "sonar-pro",
      },
      perplexity_research: {
        topic: "Model Context Protocol architecture",
        depth: "detailed",
      },
      linear_search_issues: {
        query: "bug report",
        limit: 5,
      },
      linear_get_teams: {
        limit: 10,
      },
      chrome_navigate: {
        url: "https://example.com",
        waitForLoad: true,
      },
      chrome_status: {
        random_string: "check_status",
      },
      console_execute: {
        code: "document.title",
        awaitPromise: false,
      },
    };

    return defaultArgs[toolName] || {};
  };

  // Load capabilities
  const loadCapabilities = async () => {
    setIsLoadingCapabilities(true);
    try {
      const organizationContext = simulateContext
        ? {
            organizationClerkId: selectedOrganization.clerkId,
            simulate: true,
          }
        : undefined;

      const capabilities =
        await testingService.loadCapabilities(organizationContext);
      setCapabilities(capabilities);
    } catch (error) {
      console.error("Error loading capabilities:", error);
      toast.error("Failed to load MCP capabilities");
    } finally {
      setIsLoadingCapabilities(false);
    }
  };

  // Load default test parameters
  const loadDefaultTestParams = async () => {
    try {
      const defaultParams = await testingService.loadTestData(
        "sample-requests",
        "defaults",
        selectedOrganization.id
      );

      if (defaultParams && Array.isArray(defaultParams)) {
        const toolDefault = defaultParams.find((p) => p.operation === "tool");
        const promptDefault = defaultParams.find(
          (p) => p.operation === "prompt"
        );
        const resourceDefault = defaultParams.find(
          (p) => p.operation === "resource"
        );

        if (toolDefault) {
          setToolForm({
            name: toolDefault.target || "perplexity_search",
            arguments: JSON.stringify(
              toolDefault.arguments || {
                query: "What is MCP (Model Context Protocol)?",
                model: "sonar-pro",
              },
              null,
              2
            ),
          });
        }

        if (promptDefault) {
          setPromptForm({
            name: promptDefault.target || "code_review",
          });
        }

        if (resourceDefault) {
          setResourceForm({
            uri:
              resourceDefault.target ||
              "https://jsonplaceholder.typicode.com/posts/1",
          });
        }
      }
    } catch {
      console.log("Using fallback defaults - could not load dynamic defaults");
    }
  };

  // Update defaults from capabilities
  const loadDefaultsFromCapabilities = () => {
    if (!capabilities) return;

    if (
      capabilities.tools.length > 0 &&
      toolForm.name === "perplexity_search"
    ) {
      const availableTool =
        capabilities.tools.find((t) => t.name === "perplexity_search") ||
        capabilities.tools[0];
      setToolForm((prev) => ({
        ...prev,
        name: availableTool.name,
        arguments: JSON.stringify(
          getDefaultArgsForTool(availableTool.name),
          null,
          2
        ),
      }));
    }

    if (capabilities.prompts.length > 0 && promptForm.name === "code_review") {
      const availablePrompt =
        capabilities.prompts.find((p) => p.name === "code_review") ||
        capabilities.prompts[0];
      setPromptForm((prev) => ({
        ...prev,
        name: availablePrompt.name,
      }));
    }

    if (
      capabilities.resources.length > 0 &&
      resourceForm.uri === "https://jsonplaceholder.typicode.com/posts/1"
    ) {
      const availableResource = capabilities.resources[0];
      setResourceForm((prev) => ({
        ...prev,
        uri: availableResource.uri,
      }));
    }
  };

  // Quick preset functions
  const loadQuickPreset = (preset: "search" | "debug" | "docs" | "health") => {
    switch (preset) {
      case "search":
        setToolForm({
          name: "perplexity_search",
          arguments: JSON.stringify(
            {
              query: "Latest developments in AI and machine learning",
              model: "sonar-pro",
            },
            null,
            2
          ),
        });
        setActiveTab("tools");
        break;
      case "debug":
        setToolForm({
          name: "console_execute",
          arguments: JSON.stringify(
            {
              code: "console.log('Debug info:', { url: window.location.href, timestamp: new Date().toISOString() })",
              awaitPromise: false,
            },
            null,
            2
          ),
        });
        setActiveTab("tools");
        break;
      case "docs":
        setResourceForm({
          uri: "https://modelcontextprotocol.io/introduction",
        });
        setActiveTab("resources");
        break;
      case "health":
        setHealthForm({
          target: "gateway",
        });
        setActiveTab("health");
        break;
    }
    toast.success(`Loaded ${preset} preset`);
  };

  // Load test data
  const loadTestData = async (
    type:
      | "fixtures"
      | "scenarios"
      | "mock-data"
      | "sample-requests" = "fixtures",
    category: string = "all"
  ) => {
    setIsLoadingTestData(true);
    try {
      const data = await testingService.loadTestData(
        type,
        category,
        selectedOrganization.id
      );

      if (type === "fixtures") {
        setTestFixtures(data as Record<string, TestFixtureItem[]>);
      } else if (type === "scenarios") {
        setTestScenarios(data as TestScenario[]);
      }
      toast.success(`Test ${type} loaded successfully`);
    } catch {
      console.error(`Error loading test ${type}`);
      toast.error(`Failed to load test ${type}`);
    } finally {
      setIsLoadingTestData(false);
    }
  };

  // Run test
  const runTest = async (
    operation: "tool" | "prompt" | "resource" | "health",
    target: string,
    args: Record<string, unknown> = {},
    bypassCache: boolean = false
  ) => {
    if (isTestRunning) return;

    setIsTestRunning(true);

    try {
      const result = await testingService.runTest({
        operation,
        target,
        arguments: args,
        organizationContext: {
          organizationId: selectedOrganization.id,
          organizationClerkId: selectedOrganization.clerkId,
          simulate: simulateContext,
        },
        options: {
          timeout: 15000,
          validateResponse: true,
          includeMetadata: true,
          bypassCache,
        },
      });

      setLastTestResult(result);
      setTestHistory((prev) => [result, ...prev.slice(0, 9)]);

      if (result.success) {
        const cacheStatus = result.metadata?.cached ? " (cached)" : "";
        toast.success(
          `${operation} test completed successfully (${result.responseTime}ms)${cacheStatus}`
        );
      } else {
        toast.error(
          `${operation} test failed: ${result.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Failed to run test");
    } finally {
      setIsTestRunning(false);
    }
  };

  // Test handlers - now support bypass cache
  const handleToolTest = (bypassCache: boolean = false) => {
    try {
      const args = JSON.parse(toolForm.arguments);
      runTest("tool", toolForm.name, args, bypassCache);
    } catch {
      toast.error("Invalid JSON in arguments");
    }
  };

  const handlePromptTest = (bypassCache: boolean = false) => {
    runTest("prompt", promptForm.name, {}, bypassCache);
  };

  const handleResourceTest = (bypassCache: boolean = false) => {
    runTest("resource", resourceForm.uri, {}, bypassCache);
  };

  const handleHealthTest = (bypassCache: boolean = false) => {
    runTest("health", healthForm.target, {}, bypassCache);
  };

  // Helper functions
  const getStatusIcon = (success: boolean) => {
    return success ? "success" : "error";
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Effects
  useEffect(() => {
    if (selectedOrganization.id !== currentOrganization.id) {
      loadCapabilities();
    }
    loadDefaultTestParams();
  }, [selectedOrganization, currentOrganization.id]);

  useEffect(() => {
    if (capabilities) {
      loadDefaultsFromCapabilities();
    }
  }, [capabilities]);

  return {
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
    runTest,
    handleToolTest,
    handlePromptTest,
    handleResourceTest,
    handleHealthTest,

    // Helpers
    getStatusIcon,
    formatResponseTime,
    getDefaultArgsForTool,
  };
}
