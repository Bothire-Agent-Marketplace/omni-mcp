"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  X,
  Eye,
  Settings,
  Link,
  CheckCircle2,
  AlertCircle,
  Globe,
  FileText,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import type { OrganizationResource, McpServer } from "@/types/resources";

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: OrganizationResource | null;
  mcpServers: McpServer[];
  onSave: (resource: OrganizationResource) => void;
}

// Common MIME types for suggestions
const COMMON_MIME_TYPES = [
  "text/plain",
  "text/html",
  "text/markdown",
  "application/json",
  "application/xml",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "text/csv",
  "application/javascript",
  "text/css",
];

// URI validation patterns
const URI_PATTERNS = {
  http: /^https?:\/\/.+/i,
  file: /^file:\/\/.+/i,
  data: /^data:.+/i,
  custom: /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/,
};

export function ResourceFormDialog({
  open,
  onOpenChange,
  resource,
  mcpServers,
  onSave,
}: ResourceFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [isTestingUri, setIsTestingUri] = useState(false);
  const [uriTestResult, setUriTestResult] = useState<{
    success: boolean;
    error?: string;
    contentType?: string;
    size?: string;
  } | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    mcpServerId: "",
    name: "",
    description: "",
    uri: "",
    mimeType: "",
  });

  const isEditing = !!resource;

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && resource) {
      setFormData({
        mcpServerId: resource.mcpServer.id,
        name: resource.name,
        description: resource.description,
        uri: resource.uri,
        mimeType: resource.mimeType || "",
      });
    } else if (open && !resource) {
      setFormData({
        mcpServerId: "",
        name: "",
        description: "",
        uri: "",
        mimeType: "",
      });
    }
    setUriTestResult(null);
  }, [open, resource]);

  // Auto-detect MIME type based on URI
  useEffect(() => {
    if (formData.uri && !formData.mimeType) {
      const uri = formData.uri.toLowerCase();
      let detectedMimeType = "";

      if (uri.includes(".json")) detectedMimeType = "application/json";
      else if (uri.includes(".html")) detectedMimeType = "text/html";
      else if (uri.includes(".md")) detectedMimeType = "text/markdown";
      else if (uri.includes(".txt")) detectedMimeType = "text/plain";
      else if (uri.includes(".csv")) detectedMimeType = "text/csv";
      else if (uri.includes(".xml")) detectedMimeType = "application/xml";
      else if (uri.includes(".pdf")) detectedMimeType = "application/pdf";
      else if (uri.includes(".jpg") || uri.includes(".jpeg"))
        detectedMimeType = "image/jpeg";
      else if (uri.includes(".png")) detectedMimeType = "image/png";
      else if (uri.includes(".svg")) detectedMimeType = "image/svg+xml";

      if (detectedMimeType) {
        setFormData((prev) => ({ ...prev, mimeType: detectedMimeType }));
      }
    }
  }, [formData.uri, formData.mimeType]);

  const validateUri = (uri: string): { isValid: boolean; error?: string } => {
    if (!uri.trim()) {
      return { isValid: false, error: "URI is required" };
    }

    // Check if it matches any known URI pattern
    const isValidPattern = Object.values(URI_PATTERNS).some((pattern) =>
      pattern.test(uri)
    );

    if (!isValidPattern) {
      return {
        isValid: false,
        error:
          "URI must follow a valid scheme (http://, https://, file://, data:, etc.)",
      };
    }

    return { isValid: true };
  };

  const testUri = async () => {
    const { isValid, error } = validateUri(formData.uri);
    if (!isValid) {
      setUriTestResult({ success: false, error });
      return;
    }

    setIsTestingUri(true);
    setUriTestResult(null);

    try {
      // For HTTP/HTTPS URLs, we can test them
      if (URI_PATTERNS.http.test(formData.uri)) {
        const response = await fetch(`/api/test-resource-uri`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uri: formData.uri }),
        });

        const result = await response.json();

        if (result.success) {
          setUriTestResult({
            success: true,
            contentType: result.contentType,
            size: result.size,
          });

          // Auto-fill MIME type if detected and not already set
          if (result.contentType && !formData.mimeType) {
            setFormData((prev) => ({ ...prev, mimeType: result.contentType }));
          }
        } else {
          setUriTestResult({ success: false, error: result.error });
        }
      } else {
        // For other URI schemes, just validate the format
        setUriTestResult({
          success: true,
          contentType: "Format validation passed",
        });
      }
    } catch (error) {
      setUriTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to test URI",
      });
    } finally {
      setIsTestingUri(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Name is required");
    }
    if (!formData.description.trim()) {
      errors.push("Description is required");
    }
    if (!formData.mcpServerId) {
      errors.push("MCP Server selection is required");
    }

    const uriValidation = validateUri(formData.uri);
    if (!uriValidation.isValid) {
      errors.push(uriValidation.error!);
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(`Validation errors: ${errors.join(", ")}`);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        mcpServerId: formData.mcpServerId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        uri: formData.uri.trim(),
        mimeType: formData.mimeType.trim() || null,
      };

      const url = isEditing
        ? `/api/organization/resources/${resource?.id}`
        : "/api/organization/resources";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          isEditing
            ? "Resource updated successfully!"
            : "Resource created successfully!"
        );
        onSave(data.resource);
        onOpenChange(false);
      } else {
        toast.error(data.error || "Failed to save resource");
      }
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("Failed to save resource");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const getUriTypeIcon = (uri: string) => {
    if (URI_PATTERNS.http.test(uri)) return <Globe className="w-4 h-4" />;
    if (URI_PATTERNS.file.test(uri)) return <FileText className="w-4 h-4" />;
    if (URI_PATTERNS.data.test(uri)) return <Database className="w-4 h-4" />;
    return <Link className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[98vh] w-full overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Resource" : "Create New Resource"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the resource details and configuration."
              : "Create a new custom resource for your organization."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="basic">
                <Settings className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="test">
                <Eye className="w-4 h-4 mr-2" />
                Test Resource
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 min-h-0">
              <TabsContent value="basic" className="space-y-6 mt-0">
                {/* MCP Server Selection */}
                <div className="space-y-2">
                  <Label htmlFor="mcpServer">MCP Server</Label>
                  <Select
                    value={formData.mcpServerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, mcpServerId: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select MCP Server" />
                    </SelectTrigger>
                    <SelectContent>
                      {mcpServers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter resource name"
                    disabled={isLoading}
                    className="h-12 text-lg"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter resource description"
                    rows={4}
                    disabled={isLoading}
                    className="text-base resize-none"
                  />
                </div>

                {/* URI */}
                <div className="space-y-2">
                  <Label htmlFor="uri">URI</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {getUriTypeIcon(formData.uri)}
                      </div>
                      <Input
                        id="uri"
                        value={formData.uri}
                        onChange={(e) =>
                          setFormData({ ...formData, uri: e.target.value })
                        }
                        placeholder="https://api.example.com/data or file:///path/to/file"
                        disabled={isLoading}
                        className="h-12 text-base pl-10 font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testUri}
                      disabled={!formData.uri || isTestingUri}
                      className="h-12"
                    >
                      {isTestingUri ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supported schemes: http://, https://, file://, data:, and
                    custom schemes
                  </p>
                </div>

                {/* MIME Type */}
                <div className="space-y-2">
                  <Label htmlFor="mimeType">MIME Type (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mimeType"
                      value={formData.mimeType}
                      onChange={(e) =>
                        setFormData({ ...formData, mimeType: e.target.value })
                      }
                      placeholder="application/json"
                      disabled={isLoading}
                      className="h-12"
                    />
                    <Select
                      value={formData.mimeType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, mimeType: value })
                      }
                    >
                      <SelectTrigger className="w-48 h-12">
                        <SelectValue placeholder="Common types" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_MIME_TYPES.map((mimeType) => (
                          <SelectItem key={mimeType} value={mimeType}>
                            {mimeType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Auto-detected from URI extension or can be set manually
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="test" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-lg">Resource Testing</h4>
                    <p className="text-sm text-muted-foreground">
                      Test your resource URI to verify it&apos;s accessible and
                      get metadata
                    </p>
                  </div>

                  {/* URI Display */}
                  <div className="space-y-2">
                    <Label>Resource URI</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      {getUriTypeIcon(formData.uri || "")}
                      <code className="flex-1 text-sm break-all">
                        {formData.uri || "No URI specified"}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testUri}
                        disabled={!formData.uri || isTestingUri}
                      >
                        {isTestingUri ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Test Now"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Test Results */}
                  {uriTestResult && (
                    <div className="space-y-3">
                      <Label>Test Results</Label>
                      {uriTestResult.success ? (
                        <Alert className="border-green-200 bg-green-50/50">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700">
                            <div className="space-y-2">
                              <p className="font-medium">
                                Resource is accessible!
                              </p>
                              {uriTestResult.contentType && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Content-Type:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {uriTestResult.contentType}
                                  </Badge>
                                </div>
                              )}
                              {uriTestResult.size && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Size:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {uriTestResult.size}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className="font-medium">
                                Resource test failed
                              </p>
                              <p className="text-sm">{uriTestResult.error}</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* URI Validation Info */}
                  <div className="space-y-3">
                    <Label>URI Format Guide</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Web Resources
                        </p>
                        <p className="text-muted-foreground text-xs">
                          https://api.example.com/data
                          <br />
                          http://localhost:3000/file.json
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          File Resources
                        </p>
                        <p className="text-muted-foreground text-xs">
                          file:///path/to/document.pdf
                          <br />
                          file://./relative/file.txt
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          Data URIs
                        </p>
                        <p className="text-muted-foreground text-xs">
                          data:text/plain;base64,SGVsbG8=
                          <br />
                          data:application/json,{`{"key":"value"}`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          Custom Schemes
                        </p>
                        <p className="text-muted-foreground text-xs">
                          custom://service/endpoint
                          <br />
                          db://table/collection
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-4 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            size="lg"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} size="lg">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? "Update Resource" : "Create Resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
