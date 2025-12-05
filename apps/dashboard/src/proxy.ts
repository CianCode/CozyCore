import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedRoutes = ["/servers", "/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Optimistically check for session cookie (proxy should avoid DB calls)
    // The actual session validation happens in the pages/API routes
    const sessionCookie = request.cookies.get("better-auth.session_token");

    if (!sessionCookie) {
      const signInUrl = new URL("/", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/servers/:path*", "/dashboard/:path*", "/auth/:path*"],
};
