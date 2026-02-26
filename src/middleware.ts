import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?redirect=/admin", request.url));
    }
  }

  // Protect account routes
  if (pathname.startsWith("/account")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?redirect=" + pathname, request.url));
    }
  }

  // Protect checkout
  if (pathname.startsWith("/checkout")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?redirect=/checkout", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout", "/checkout/:path*"],
};
