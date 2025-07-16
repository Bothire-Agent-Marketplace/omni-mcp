import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

export default async function RolesManagementPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await DatabaseService.getOrganizationByClerkId(orgId);

  if (!organization) {
    redirect("/");
  }

  const roles = [
    {
      name: "Admin",
      value: "ADMIN",
      description: "Full access to organization settings and user management",
      permissions: ["manage_users", "manage_settings", "manage_services", "view_audit_logs"],
    },
    {
      name: "Member",
      value: "MEMBER", 
      description: "Access to organization services and basic functionality",
      permissions: ["use_services", "view_organization"],
    },
    {
      name: "Viewer",
      value: "VIEWER",
      description: "Read-only access to organization information",
      permissions: ["view_organization"],
    },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'MEMBER':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Role Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage roles and permissions for your organization.
        </p>
      </div>

      <Separator />

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {roles.map((role) => (
              <div key={role.value} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Shield className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={getRoleBadgeVariant(role.value)}>
                      {role.value}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <Badge key={permission} variant="outline">
                        {permission.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Role permissions are currently managed through Clerk. Custom role management will be available in a future update.
        </AlertDescription>
      </Alert>
    </div>
  );
} 