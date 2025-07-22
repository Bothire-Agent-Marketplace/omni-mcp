"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import type { McpTestResult } from "@/lib/services/testing.service";

interface TestHistoryDisplayProps {
  testHistory: McpTestResult[];
  formatResponseTime: (ms: number) => string;
}

export function TestHistoryDisplay({
  testHistory,
  formatResponseTime,
}: TestHistoryDisplayProps) {
  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  if (testHistory.length === 0) {
    return null;
  }

  return (
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
  );
}
