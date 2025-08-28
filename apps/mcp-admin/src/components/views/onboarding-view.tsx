import { Plus } from "lucide-react";
import { CreateOrganizationForm } from "../forms/create-organization-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";

export function OnboardingView() {
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
              <CreateOrganizationForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>);

}