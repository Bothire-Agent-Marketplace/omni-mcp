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
import { Settings, Users, Shield, Activity, Zap } from "lucide-react";
import { OrganizationSwitcher } from "../forms/organization-switcher";

interface Organization {
  id: string;
  name: string;
  membersCount?: number;
}

interface Membership {
  id: string;
  role: string;
  organization: Organization;
}

interface DashboardViewProps {
  userMemberships: Membership[];
  activeOrgId: string | null;
}

export function DashboardView({
  userMemberships,
  activeOrgId,
}: DashboardViewProps) {
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Your Organizations
                  </CardTitle>
                  <CardDescription>
                    You belong to {userMemberships.length} organization(s)
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {activeOrgId ? "Active" : "Select one"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userMemberships.map((membership) => (
                  <Card key={membership.id} className="relative">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            {membership.organization.name}
                          </h3>
                          <Badge
                            variant={
                              membership.organization.id === activeOrgId
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
                        {membership.organization.id === activeOrgId ? (
                          <Link href="/organization/settings">
                            <Button size="sm" className="w-full">
                              <Settings className="w-4 h-4 mr-2" />
                              Manage
                            </Button>
                          </Link>
                        ) : (
                          <OrganizationSwitcher
                            organizationId={membership.organization.id}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

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
                  {userMemberships?.[0]?.organization?.membersCount || 1}
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
