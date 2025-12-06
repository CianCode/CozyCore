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
    // Check for session cookie with the correct prefix (cozycore)
    const sessionCookie = request.cookies.get("cozycore.session_token");

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
