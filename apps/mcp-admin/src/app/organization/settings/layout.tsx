"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const settingsNavigation = [
{ name: "General", href: "/organization/settings/general", value: "general" },
{ name: "Users", href: "/organization/settings/users", value: "users" },
{ name: "Roles", href: "/organization/settings/roles", value: "roles" },
{
  name: "MCP Prompts",
  href: "/organization/settings/prompts",
  value: "prompts"
},
{
  name: "MCP Resources",
  href: "/organization/settings/resources",
  value: "resources"
},
{
  name: "MCP Testing",
  href: "/organization/settings/testing",
  value: "testing"
}];


export default function SettingsLayout({
  children


}: {children: React.ReactNode;}) {
  const pathname = usePathname();
  const currentTab = pathname.split("/").pop() || "general";

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {settingsNavigation.map((item) =>
          <TabsTrigger key={item.value} value={item.value} asChild>
              <Link href={item.href}>{item.name}</Link>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>);

}