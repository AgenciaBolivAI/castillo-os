import { NextResponse, type NextRequest } from "next/server";

/**
 * Single-password gate. The login action verifies the password against
 * CASTILLO_OS_PASSWORD and sets the `castillo_os` cookie to the value of
 * CASTILLO_OS_COOKIE_SECRET — so the raw password never lands in a cookie.
 * Middleware just checks the cookie matches the secret.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /login is always reachable
  if (pathname === "/login") return NextResponse.next();

  const cookie = request.cookies.get("castillo_os")?.value;
  const secret = process.env.CASTILLO_OS_COOKIE_SECRET;

  if (!secret || cookie !== secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Gate everything except Next internals and the favicon.
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
