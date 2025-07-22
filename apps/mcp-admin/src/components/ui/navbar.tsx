import Link from "next/link";
import { NavbarClient } from "./navbar-client";

export default function Navbar() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-xl font-semibold hover:text-muted-foreground transition-colors"
          >
            MCP Admin Dashboard
          </Link>

          <NavbarClient />
        </div>
      </div>
    </header>
  );
}
