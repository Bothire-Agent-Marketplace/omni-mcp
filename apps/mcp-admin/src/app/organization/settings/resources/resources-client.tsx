"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Eye, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  OrganizationResource,
  DefaultResource,
  McpServer,
} from "@/types/resources";

interface ResourcesClientProps {
  resources: OrganizationResource[];
  defaultResources: DefaultResource[];
  mcpServers: McpServer[];
  organizationId: string;
  userId: string;
}

export function ResourcesClient({
  resources,
  defaultResources,
  mcpServers: _mcpServers,
  organizationId: _organizationId,
  userId: _userId,
}: ResourcesClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">MCP Resources</h3>
          <p className="text-sm text-muted-foreground">
            Manage custom resources for your organization&apos;s MCP servers.
            <span className="ml-1">
              Also manage{" "}
              <a
                href="/organization/settings/prompts"
                className="text-primary hover:underline"
              >
                MCP Prompts
              </a>
              .
            </span>
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Resource
        </Button>
      </div>

      <Separator />

      {/* Custom Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Resources ({resources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No custom resources created yet. Create one or copy from defaults
              below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URI</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>MIME Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-mono text-sm">
                      {resource.uri}
                    </TableCell>
                    <TableCell className="font-medium">
                      {resource.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {resource.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {resource.mcpServer.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {resource.mimeType && (
                        <Badge variant="outline">{resource.mimeType}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Default Resources */}
      <Card>
        <CardHeader>
          <CardTitle>
            System Default Resources ({defaultResources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URI</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>MIME Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaultResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-mono text-sm">
                    {resource.uri}
                  </TableCell>
                  <TableCell className="font-medium">{resource.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {resource.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{resource.mcpServer.name}</Badge>
                  </TableCell>
                  <TableCell>
                    {resource.mimeType && (
                      <Badge variant="outline">{resource.mimeType}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
