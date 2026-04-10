import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "quiz_auth_token";

const PUBLIC_PAGE_PREFIXES = ["/auth/"];
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-otp",
  "/api/auth/google",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }

  // Allow public page routes
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // API routes — return 401 JSON if unauthenticated
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp as number | undefined;
    if (!payload?.userId || (exp && Date.now() / 1000 > exp)) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please sign in again." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // Page routes — redirect to login if unauthenticated
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp as number | undefined;
  if (!payload?.userId || (exp && Date.now() / 1000 > exp)) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.set(AUTH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
