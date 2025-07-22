import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

// Define protected routes - all routes except sign-in, sign-up, and webhooks
const isProtectedRoute = createRouteMatcher([
  "/((?!sign-in|sign-up|api/webhooks).*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Skip processing for static files and Next.js internals
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.includes(".") ||
    req.nextUrl.pathname === "/favicon.ico"
  ) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect(); // Redirects unauthenticated users to sign-in
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
