import { 
  CreateOrganization
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Shield, Activity, Zap } from "lucide-react";

export default async function Home() {
  const { userId, orgId } = await auth();

  return (
    <main className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!orgId ? (
          /* No organization selected - show create organization */
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Create Your Organization</CardTitle>
                <CardDescription>
                  Get started by creating your first organization to manage your MCP services.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateOrganization 
                  routing="hash"
                  afterCreateOrganizationUrl="/"
                  appearance={{
                    elements: {
                      rootBox: "w-full"
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Organization selected - show dashboard */
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organization Settings</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Configure</div>
                  <p className="text-xs text-muted-foreground">
                    Manage your organization
                  </p>
                  <Button className="mt-4 w-full" asChild>
                    <Link href="/organization/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Open Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Management</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Manage</div>
                  <p className="text-xs text-muted-foreground">
                    Invite and manage team members
                  </p>
                  <Button className="mt-4 w-full" asChild>
                    <Link href="/organization/settings/users">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Team
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Role Management</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Control</div>
                  <p className="text-xs text-muted-foreground">
                    Manage roles and permissions
                  </p>
                  <Button className="mt-4 w-full" asChild>
                    <Link href="/organization/settings/roles">
                      <Shield className="mr-2 h-4 w-4" />
                      Manage Roles
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* MCP Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  Available MCP Services
                </CardTitle>
                <CardDescription>
                  Manage your organization's MCP service integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Linear Integration</p>
                        <p className="text-sm text-muted-foreground">Project management</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="font-medium">Perplexity AI</p>
                        <p className="text-sm text-muted-foreground">AI research</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium">Development Tools</p>
                        <p className="text-sm text-muted-foreground">Dev utilities</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>
                  Quick overview of your organization details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{userId}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Organization ID</p>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{orgId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
