import Link from "next/link";
import { NavbarClient } from "./navbar-client";

export default function Navbar() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
          >
            MCP Admin Dashboard
          </Link>

          <NavbarClient />
        </div>
      </div>
    </header>
  );
}
