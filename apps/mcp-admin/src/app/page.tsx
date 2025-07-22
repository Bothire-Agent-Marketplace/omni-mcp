"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Users,
  Shield,
  Activity,
  Zap,
  Loader2,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  const { userId, orgId, isLoaded } = useAuth();
  const {
    userMemberships,
    isLoaded: orgListLoaded,
    setActive,
    createOrganization,
  } = useOrganizationList();
  const router = useRouter();
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-select first organization if user has one but none is active
  useEffect(() => {
    if (
      isLoaded &&
      orgListLoaded &&
      userId &&
      !orgId &&
      userMemberships?.data &&
      userMemberships.data.length > 0
    ) {
      const firstOrg = userMemberships.data[0];
      console.log(
        "Auto-selecting first organization:",
        firstOrg.organization.id
      );
      setActive?.({ organization: firstOrg.organization.id });
    }
  }, [isLoaded, orgListLoaded, userId, orgId, userMemberships, setActive]);

  // Handle custom organization creation
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || isCreatingOrg || !createOrganization || !setActive)
      return;

    try {
      setIsCreatingOrg(true);
      console.log("Creating organization:", orgName);

      // Create the organization
      const organization = await createOrganization({ name: orgName.trim() });

      console.log("Organization created successfully:", organization.id);

      // Immediately set it as active
      await setActive({ organization: organization.id });

      console.log("Organization set as active:", organization.id);

      // Reset form
      setOrgName("");
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create organization:", error);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded || !orgListLoaded) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
                  Get started by creating your first organization to manage your
                  MCP services.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showCreateForm ? (
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                  </Button>
                ) : (
                  <form
                    onSubmit={handleCreateOrganization}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Enter organization name"
                        required
                        disabled={isCreatingOrg}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={
                          !orgName.trim() ||
                          isCreatingOrg ||
                          !createOrganization
                        }
                        className="flex-1"
                      >
                        {isCreatingOrg ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          setOrgName("");
                        }}
                        disabled={isCreatingOrg}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
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
                  <CardTitle className="text-sm font-medium">
                    Organization Settings
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium">
                    Team Management
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium">
                    Role Management
                  </CardTitle>
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
                  Manage your organization&apos;s MCP service integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Linear Integration</p>
                        <p className="text-sm text-muted-foreground">
                          Project management
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="font-medium">Perplexity AI</p>
                        <p className="text-sm text-muted-foreground">
                          AI research
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium">Development Tools</p>
                        <p className="text-sm text-muted-foreground">
                          Dev utilities
                        </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      User ID
                    </p>
                    <p className="font-mono text-sm bg-muted p-2 rounded">
                      {userId}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Organization ID
                    </p>
                    <p className="font-mono text-sm bg-muted p-2 rounded">
                      {orgId}
                    </p>
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
