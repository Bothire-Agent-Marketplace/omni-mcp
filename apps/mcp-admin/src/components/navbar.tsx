"use client";

import Link from "next/link";
import dynamic from "next/dynamic";


const NavbarClient = dynamic(
  () =>
  import("./navbar-client").then((mod) => ({ default: mod.NavbarClient })),
  {
    ssr: false,
    loading: () =>
    <div className="flex items-center space-x-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      </div>

  }
);

export default function Navbar() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-xl font-semibold text-foreground hover:text-primary transition-colors">

            MCP Admin Dashboard
          </Link>

          <NavbarClient />
        </div>
      </div>
    </header>);

}