import { 
  UserButton, 
  OrganizationSwitcher
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default async function Navbar() {
  let orgId;
  
  try {
    const authResult = await auth();
    orgId = authResult.orgId;
  } catch (error) {
    console.error("Auth error in navbar:", error);
    orgId = null;
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-semibold hover:text-muted-foreground transition-colors">
            MCP Admin Dashboard
          </Link>
          
          <div className="flex items-center space-x-4">
            {orgId && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/organization/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/"
              afterLeaveOrganizationUrl="/"
              afterSelectOrganizationUrl="/"
              createOrganizationMode="modal"
              appearance={{
                elements: {
                  rootBox: "flex items-center"
                }
              }}
            />
            
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
} 