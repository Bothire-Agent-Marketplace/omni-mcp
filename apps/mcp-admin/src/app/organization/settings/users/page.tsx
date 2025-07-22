import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DatabaseService } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserPlus } from "lucide-react";

export default async function UsersManagementPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await DatabaseService.getOrganizationByClerkId(orgId);

  if (!organization) {
    redirect("/");
  }

  // Get organization members
  const members = await DatabaseService.getOrganizationMembers(organization.id);

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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage users and their roles in your organization.
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <Separator />

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No team members found.</p>
            <Button className="mt-4" variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite your first team member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage 
                        src={member.user.imageUrl || ''} 
                        alt={`${member.user.firstName || ''} ${member.user.lastName || ''}`}
                      />
                      <AvatarFallback>
                        {member.user.firstName?.charAt(0) || ''}{member.user.lastName?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Role</DropdownMenuItem>
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Remove from Organization
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 