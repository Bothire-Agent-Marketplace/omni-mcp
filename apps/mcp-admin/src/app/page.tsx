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
import dynamic from "next/dynamic";

function HomePage() {
  const { userId, orgId, isLoaded } = useAuth();
  const {
    userMemberships,
    isLoaded: orgListLoaded,
    setActive,
    createOrganization,
  } = useOrganizationList();
  const _router = useRouter();
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [hasCreatedOrg, setHasCreatedOrg] = useState(false);

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

      // Create the organization
      const organization = await createOrganization({ name: orgName.trim() });

      // Immediately set it as active
      await setActive({ organization: organization.id });

      // Mark that we've created an organization
      setHasCreatedOrg(true);

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

  // User is authenticated but has no organization and hasn't just created one
  if (
    userId &&
    !hasCreatedOrg &&
    (!userMemberships?.data || userMemberships.data.length === 0)
  ) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                Welcome to MCP Admin
              </h1>
              <p className="text-xl text-muted-foreground">
                Get started by creating your first organization
              </p>
            </div>

            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Organization
                </CardTitle>
                <CardDescription>
                  Organizations help you manage MCP servers, team members, and
                  resources in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showCreateForm ? (
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    size="lg"
                    className="w-full"
                    disabled={!createOrganization}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Organization
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
        </div>
      </main>
    );
  }

  // User has organizations - show dashboard
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              MCP Admin Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage your MCP servers and team collaboration
            </p>
          </div>

          {/* Current Organization Info */}
          {userMemberships?.data && userMemberships.data.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Your Organizations
                    </CardTitle>
                    <CardDescription>
                      You belong to {userMemberships.data.length}{" "}
                      organization(s)
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {orgId ? "Active" : "Select one"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userMemberships.data.map((membership) => (
                    <Card key={membership.id} className="relative">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">
                              {membership.organization.name}
                            </h3>
                            <Badge
                              variant={
                                membership.organization.id === orgId
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {membership.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {membership.organization.membersCount || 0} members
                          </p>
                          {membership.organization.id === orgId ? (
                            <Link href="/organization/settings">
                              <Button size="sm" className="w-full">
                                <Settings className="w-4 h-4 mr-2" />
                                Manage
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() =>
                                setActive?.({
                                  organization: membership.organization.id,
                                })
                              }
                            >
                              Switch To
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Organization Settings
                </CardTitle>
                <CardDescription>
                  Manage organization details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/organization/settings">
                  <Button className="w-full">View Settings</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Invite members and manage roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/organization/settings/users">
                  <Button className="w-full" variant="outline">
                    Manage Users
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  MCP Services
                </CardTitle>
                <CardDescription>
                  Configure and monitor MCP servers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" disabled>
                  <Activity className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Servers
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  MCP servers running
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userMemberships?.data?.[0]?.organization?.membersCount || 1}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active collaborators
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  API Requests
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.4K</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.9%</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

// Export with dynamic configuration to disable SSR
export default dynamic(() => Promise.resolve(HomePage), {
  ssr: false,
  loading: () => (
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
  ),
});
