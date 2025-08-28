import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { CreateResourceButton } from "../forms/create-resource-button";
import { ResourceActions } from "../forms/resource-actions";
import type {
  OrganizationResource,
  DefaultResource,
  McpServer } from
"@/types/resources";

interface ResourcesViewProps {
  resources: OrganizationResource[];
  defaultResources: DefaultResource[];
  mcpServers: McpServer[];
  organizationId: string;
  userId: string;
}

export function ResourcesView({
  resources,
  defaultResources,
  mcpServers,
  organizationId,
  userId
}: ResourcesViewProps) {
  return (
    <div className="space-y-6">
      {}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resources</h2>
          <p className="text-muted-foreground">
            Manage custom resources for your MCP servers
          </p>
        </div>
        <CreateResourceButton
          mcpServers={mcpServers}
          organizationId={organizationId}
          userId={userId} />

      </div>

      {}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Organization Resources</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Custom resources created for your organization
              </p>
            </div>
            <Badge variant="outline">
              {resources.length} resource{resources.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ?
          <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No custom resources yet. Create your first resource to get
                started.
              </p>
              <CreateResourceButton
              mcpServers={mcpServers}
              organizationId={organizationId}
              userId={userId} />

            </div> :

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>URI</TableHead>
                  <TableHead>MIME Type</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) =>
              <TableRow key={resource.id}>
                    <TableCell className="font-medium">
                      {resource.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {resource.mcpServer.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-md truncate">
                      {resource.uri}
                    </TableCell>
                    <TableCell>
                      {resource.mimeType ?
                  <Badge variant="outline" className="text-xs">
                          {resource.mimeType}
                        </Badge> :

                  <span className="text-muted-foreground text-sm">—</span>
                  }
                    </TableCell>
                    <TableCell>
                      {resource.createdByUser ?
                  <span className="text-sm">
                          {resource.createdByUser.firstName}{" "}
                          {resource.createdByUser.lastName}
                        </span> :

                  <span className="text-sm text-muted-foreground">
                          System
                        </span>
                  }
                    </TableCell>
                    <TableCell>
                      <ResourceActions
                    resource={resource}
                    organizationId={organizationId}
                    mcpServers={mcpServers} />

                    </TableCell>
                  </TableRow>
              )}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Default Resources Reference</CardTitle>
          <p className="text-sm text-muted-foreground">
            Built-in resources available across all MCP servers for reference
          </p>
        </CardHeader>
        <CardContent>
          {defaultResources.length === 0 ?
          <p className="text-center py-4 text-muted-foreground">
              No default resources available
            </p> :

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {defaultResources.map((resource) =>
            <Card key={resource.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{resource.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {resource.mcpServer.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {resource.description}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {resource.uri}
                      </p>
                      {resource.mimeType &&
                  <Badge variant="outline" className="text-xs">
                          {resource.mimeType}
                        </Badge>
                  }
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </CardContent>
      </Card>
    </div>);

}