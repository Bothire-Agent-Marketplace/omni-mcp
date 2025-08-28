import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/((?!sign-in|sign-up|api/webhooks|api/health|health|_not-found|not-found).*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.includes(".") ||
    req.nextUrl.pathname === "/favicon.ico" ||
    req.nextUrl.pathname === "/_not-found" ||
    req.nextUrl.pathname === "/not-found"
  ) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    "/(api|trpc)(.*)",
  ],
};
