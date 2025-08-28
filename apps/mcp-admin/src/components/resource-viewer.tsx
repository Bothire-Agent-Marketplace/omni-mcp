"use client";

import {
  Copy,
  User,
  Settings,
  Link,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Globe,
  FileText,
  Database,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizationResource, DefaultResource } from "@/types/resources";

interface ResourceViewerProps {
  resource: OrganizationResource | DefaultResource;
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

const URI_PATTERNS = {
  http: /^https?:\/\/.+/i,
  file: /^file:\/\/.+/i,
  data: /^data:.+/i,
  custom: /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/,
};

export function ResourceViewer({
  resource,
  className,
  showActions = true,
  onEdit,
  onCopy,
  onDelete: _onDelete,
}: ResourceViewerProps) {
  const [uriTestResult, setUriTestResult] = useState<{
    success: boolean;
    error?: string;
    contentType?: string;
    size?: string;
    accessible?: boolean;
  } | null>(null);
  const [isTestingUri, setIsTestingUri] = useState(false);

  const isCustomResource = "createdByUser" in resource;

  const getUriInfo = (uri: string) => {
    if (URI_PATTERNS.http.test(uri)) {
      return {
        type: "Web Resource",
        icon: Globe,
        scheme: "HTTP/HTTPS",
        accessible: true,
        badgeVariant: "default" as const,
      };
    }
    if (URI_PATTERNS.file.test(uri)) {
      return {
        type: "File Resource",
        icon: FileText,
        scheme: "File System",
        accessible: false,
        badgeVariant: "secondary" as const,
      };
    }
    if (URI_PATTERNS.data.test(uri)) {
      return {
        type: "Data URI",
        icon: Database,
        scheme: "Embedded Data",
        accessible: true,
        badgeVariant: "outline" as const,
      };
    }
    return {
      type: "Custom Resource",
      icon: Link,
      scheme: "Custom Scheme",
      accessible: false,
      badgeVariant: "secondary" as const,
    };
  };

  const uriInfo = getUriInfo(resource.uri);

  const testUri = async () => {
    if (!uriInfo.accessible) return;

    setIsTestingUri(true);
    try {
      const response = await fetch("/api/test-resource-uri", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uri: resource.uri }),
      });

      const result = await response.json();
      setUriTestResult(result);
    } catch {
      setUriTestResult({
        success: false,
        error: "Failed to test URI",
        accessible: false,
      });
    } finally {
      setIsTestingUri(false);
    }
  };

  useEffect(() => {
    if (uriInfo.accessible) {
      testUri();
    }
  }, [resource.uri, uriInfo.accessible]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatUserName = (
    user?: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    } | null
  ) => {
    if (!user) return "System";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const openResource = () => {
    if (URI_PATTERNS.http.test(resource.uri)) {
      window.open(resource.uri, "_blank");
    } else {
      toast.info("This resource type cannot be opened in browser");
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {}
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground">
              {resource.name}
            </h2>
            {isCustomResource && <Badge variant="outline">Custom</Badge>}
            {!isCustomResource && <Badge variant="secondary">Default</Badge>}
            {resource.mimeType && (
              <Badge variant="outline" className="font-mono text-xs">
                {resource.mimeType}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            {resource.description}
          </p>

          {}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Server className="w-4 h-4" />
              <span>{resource.mcpServer.name}</span>
            </div>

            {isCustomResource && (
              <>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>
                    Created by{" "}
                    {formatUserName(
                      (resource as OrganizationResource).createdByUser
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(
                      (resource as OrganizationResource).createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {}
        {showActions && (
          <div className="flex items-center gap-2">
            {uriInfo.accessible && (
              <Button variant="outline" size="sm" onClick={openResource}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onCopy && (
              <Button variant="outline" size="sm" onClick={onCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            )}
          </div>
        )}
      </div>

      {}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <uriInfo.icon className="w-5 h-5 text-primary" />
            Resource URI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={uriInfo.badgeVariant}>{uriInfo.type}</Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {uriInfo.scheme}
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all">
              {resource.uri}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(resource.uri, "URI")}
              className="w-fit"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy URI
            </Button>
          </div>

          {}
          {uriInfo.accessible && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testUri}
                  disabled={isTestingUri}
                >
                  {isTestingUri ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Test URI
                    </>
                  )}
                </Button>
              </div>

              {uriTestResult && (
                <Alert
                  className={
                    uriTestResult.success
                      ? "border-green-200"
                      : "border-red-200"
                  }
                >
                  <div className="flex items-center gap-2">
                    {uriTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {uriTestResult.success
                        ? "URI Accessible"
                        : "URI Not Accessible"}
                    </span>
                  </div>
                  <AlertDescription className="mt-2">
                    {uriTestResult.success ? (
                      <div className="space-y-1">
                        {uriTestResult.contentType && (
                          <div>
                            Content Type:{" "}
                            <code className="bg-muted px-1 rounded">
                              {uriTestResult.contentType}
                            </code>
                          </div>
                        )}
                        {uriTestResult.size && (
                          <div>
                            Size:{" "}
                            <code className="bg-muted px-1 rounded">
                              {uriTestResult.size}
                            </code>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>{uriTestResult.error}</div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {isCustomResource && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Resource Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  ID
                </div>
                <div className="font-mono text-sm bg-muted rounded px-2 py-1 break-all">
                  {(resource as OrganizationResource).id}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  MCP Server
                </div>
                <div className="text-sm">{resource.mcpServer.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">
                  {new Date(
                    (resource as OrganizationResource).createdAt
                  ).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Updated
                </div>
                <div className="text-sm">
                  {new Date(
                    (resource as OrganizationResource).updatedAt
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
