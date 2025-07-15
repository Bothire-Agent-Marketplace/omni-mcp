import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define protected routes - all routes except sign-in, sign-up, and webhooks
const isProtectedRoute = createRouteMatcher([
  "/((?!sign-in|sign-up|api/webhooks).*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect(); // Redirects unauthenticated users to sign-in
  }
});

export const config = {
  matcher: [
    // Protect all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
