"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { AIResponseRenderer } from "@/components/ai-response-renderer";
import type { McpTestResult } from "@/lib/services/testing.service";

interface TestResultsDisplayProps {
  lastTestResult: McpTestResult;
  formatResponseTime: (ms: number) => string;
}

export function TestResultsDisplay({
  lastTestResult,
  formatResponseTime,
}: TestResultsDisplayProps) {
  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last Test Result</CardTitle>
        <CardDescription>
          Most recent test execution details and response data
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
              {lastTestResult.metadata?.cached && (
                <Badge variant="secondary" className="text-xs">
                  <Timer className="w-3 h-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Response Time
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" />
              {formatResponseTime(lastTestResult.responseTime)}
              {lastTestResult.metadata?.cached &&
                lastTestResult.metadata?.cacheAge && (
                  <span className="text-xs text-muted-foreground">
                    (cached{" "}
                    {Math.round(
                      (lastTestResult.metadata.cacheAge as number) / 1000
                    )}
                    s ago)
                  </span>
                )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Timestamp</Label>
            <div className="text-sm mt-1">
              {new Date(lastTestResult.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Operation</Label>
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
            <AIResponseRenderer response={lastTestResult.result} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
