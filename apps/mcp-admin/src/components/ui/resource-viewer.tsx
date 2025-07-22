"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { OrganizationResource, DefaultResource } from "@/types/resources";

interface ResourceViewerProps {
  resource: OrganizationResource | DefaultResource;
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

// URI validation patterns
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
  onDelete,
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

  // Determine URI scheme and type
  const getUriInfo = (uri: string) => {
    if (URI_PATTERNS.http.test(uri)) {
      return {
        type: "Web Resource",
        icon: Globe,
        scheme: "HTTP/HTTPS",
        accessible: true,
      };
    }
    if (URI_PATTERNS.file.test(uri)) {
      return {
        type: "File Resource",
        icon: FileText,
        scheme: "File System",
        accessible: false,
      };
    }
    if (URI_PATTERNS.data.test(uri)) {
      return {
        type: "Data URI",
        icon: Database,
        scheme: "Embedded Data",
        accessible: true,
      };
    }
    return {
      type: "Custom Resource",
      icon: Link,
      scheme: "Custom Scheme",
      accessible: false,
    };
  };

  const uriInfo = getUriInfo(resource.uri);

  // Test URI accessibility
  const testUri = async () => {
    setIsTestingUri(true);
    setUriTestResult(null);

    try {
      if (URI_PATTERNS.http.test(resource.uri)) {
        const response = await fetch(`/api/test-resource-uri`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uri: resource.uri }),
        });

        const result = await response.json();

        if (result.success) {
          setUriTestResult({
            success: true,
            contentType: result.contentType,
            size: result.size,
            accessible: true,
          });
        } else {
          setUriTestResult({
            success: false,
            error: result.error,
            accessible: false,
          });
        }
      } else {
        // For non-HTTP URIs, just validate format
        setUriTestResult({
          success: true,
          contentType: "Format validation passed",
          accessible: false,
        });
      }
    } catch (error) {
      setUriTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to test URI",
        accessible: false,
      });
    } finally {
      setIsTestingUri(false);
    }
  };

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{resource.name}</h2>
            {isCustomResource && (
              <Badge variant="outline" className="text-xs">
                Custom
              </Badge>
            )}
            {!isCustomResource && (
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
              >
                Default
              </Badge>
            )}
            {resource.mimeType && (
              <Badge variant="secondary" className="text-xs">
                {resource.mimeType}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            {resource.description}
          </p>

          {/* Meta information */}
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

        {/* Actions */}
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
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource URI */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <uriInfo.icon className="w-5 h-5" />
              Resource URI
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(resource.uri, "URI")}
              >
                <Copy className="w-4 h-4" />
              </Button>
              {uriInfo.accessible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testUri}
                  disabled={isTestingUri}
                >
                  {isTestingUri ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    "Test"
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm break-all font-mono">
                  {resource.uri}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="text-muted-foreground">{uriInfo.type}</p>
                </div>
                <div>
                  <span className="font-medium">Scheme:</span>
                  <p className="text-muted-foreground">{uriInfo.scheme}</p>
                </div>
              </div>

              {/* URI Test Results */}
              {uriTestResult && (
                <div className="space-y-2">
                  {uriTestResult.success ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        <div className="space-y-1">
                          <p className="font-medium">Resource is accessible!</p>
                          {uriTestResult.contentType && (
                            <p className="text-sm">
                              Content-Type: {uriTestResult.contentType}
                            </p>
                          )}
                          {uriTestResult.size && (
                            <p className="text-sm">
                              Size: {uriTestResult.size}
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">Resource test failed</p>
                          <p className="text-sm">{uriTestResult.error}</p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resource Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Resource Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Name
              </h4>
              <p className="text-sm font-medium">{resource.name}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Description
              </h4>
              <p className="text-sm">{resource.description}</p>
            </div>

            {resource.mimeType && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  MIME Type
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {resource.mimeType}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(resource.mimeType!, "MIME Type")
                    }
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                MCP Server
              </h4>
              <Badge variant="secondary" className="text-xs">
                {resource.mcpServer.name}
              </Badge>
            </div>

            {isCustomResource && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Created By
                  </h4>
                  <p className="text-sm">
                    {formatUserName(
                      (resource as OrganizationResource).createdByUser
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Created Date
                  </h4>
                  <p className="text-sm">
                    {new Date(
                      (resource as OrganizationResource).createdAt
                    ).toLocaleString()}
                  </p>
                </div>

                {(resource as OrganizationResource).updatedAt !==
                  (resource as OrganizationResource).createdAt && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Last Updated
                    </h4>
                    <p className="text-sm">
                      {new Date(
                        (resource as OrganizationResource).updatedAt
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Usage Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm mb-2">
                How to use this resource:
              </h5>
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  This resource can be accessed by MCP clients through the{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    resources/read
                  </code>{" "}
                  method.
                </p>
                <div className="text-xs font-mono bg-muted p-2 rounded">
                  {`{"method": "resources/read", "params": {"uri": "${resource.uri}"}}`}
                </div>
              </div>
            </div>

            {uriInfo.type === "Web Resource" && (
              <div>
                <h5 className="font-medium text-sm mb-2">
                  Web Resource Access:
                </h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    • This resource is hosted on the web and can be fetched via
                    HTTP
                  </p>
                  <p>
                    • Ensure the server allows cross-origin requests if needed
                  </p>
                  <p>
                    • Check authentication requirements for private resources
                  </p>
                </div>
              </div>
            )}

            {uriInfo.type === "File Resource" && (
              <div>
                <h5 className="font-medium text-sm mb-2">
                  File System Access:
                </h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• This resource points to a local file system path</p>
                  <p>
                    • Ensure the MCP server has read permissions for this path
                  </p>
                  <p>
                    • File paths may be relative to the server's working
                    directory
                  </p>
                </div>
              </div>
            )}

            {uriInfo.type === "Data URI" && (
              <div>
                <h5 className="font-medium text-sm mb-2">Embedded Data:</h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    • This resource contains embedded data within the URI itself
                  </p>
                  <p>
                    • No external fetching required - data is immediately
                    available
                  </p>
                  <p>• Suitable for small datasets and configuration values</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
