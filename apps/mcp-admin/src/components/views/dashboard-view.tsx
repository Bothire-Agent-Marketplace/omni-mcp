import {
  Activity,
  BarChart3,
  Building2,
  Crown,
  Globe,
  Settings,
  TrendingUp,
  Users,
  Zap,
  Server,
  Shield,
  Clock } from
"lucide-react";
import Link from "next/link";
import { OrganizationSwitcher } from "../forms/organization-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  activeOrgId
}: DashboardViewProps) {
  const activeMembership = userMemberships.find(
    (m) => m.organization.id === activeOrgId
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">
              Organizations
            </h2>
            <Badge variant="outline" className="text-xs">
              {userMemberships.length} Active
            </Badge>
          </div>

          {userMemberships.map((membership) =>
          <Card
            key={membership.id}
            className="hover:shadow-md transition-shadow duration-200">

              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-card-foreground">
                        {membership.organization.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {membership.organization.membersCount || 0} members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      <Crown className="w-3 h-3 mr-1" />
                      {membership.role.charAt(0).toUpperCase() +
                    membership.role.slice(1)}
                    </Badge>
                    {membership.organization.id === activeOrgId ?
                  <Link href="/organization/settings">
                        <Button>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                      </Link> :

                  <OrganizationSwitcher
                    organizationId={membership.organization.id} />

                  }
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-card-foreground">
                  Organization Settings
                </CardTitle>
              </div>
              <CardDescription>
                Manage organization details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/organization/settings">
                <Button variant="outline" className="w-full">
                  View Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-card-foreground">
                  Team Management
                </CardTitle>
              </div>
              <CardDescription>Invite members and manage roles</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/organization/settings/users">
                <Button variant="outline" className="w-full">
                  Manage Users
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-card-foreground">
                  MCP Services
                </CardTitle>
              </div>
              <CardDescription>
                Configure and monitor MCP servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                <Clock className="w-4 h-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">
              System Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Servers
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-1">3</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MCP servers running
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Server className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Team Members
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {activeMembership?.organization?.membersCount || 1}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active collaborators
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      API Requests
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      12.4K
                    </p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      This month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Uptime
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      99.9%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 30 days
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={99.9} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>
              Latest updates from your MCP infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    All servers are running optimally
                  </p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    API usage increased by 15% this week
                  </p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Settings className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Organization settings updated
                  </p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);

}