import { NextResponse, type NextRequest } from "next/server";

/**
 * Single-password gate for the main dashboard.
 *
 *   /login                        → always reachable
 *   /hud/*                        → device-token cookie (separate from the
 *                                   admin password). If the query string
 *                                   carries ?token=…, the cookie is set from
 *                                   it and we redirect to the clean URL.
 *   /api/hud/stream               → same device-token cookie
 *   /api/hud/token  (token mint)  → admin password (so an authed admin can
 *                                   mint new device tokens)
 *   everything else               → admin password
 *
 * Actual validation of the device-token hash against brain.hud_devices
 * happens in /hud/layout.tsx (server component) and the stream route —
 * we don't want to call Supabase from edge middleware on every request.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") return NextResponse.next();

  // ── HUD device-token paths ──────────────────────────────────────────
  const isHudPath = pathname.startsWith("/hud");
  const isHudStream = pathname === "/api/hud/stream";

  if (isHudPath || isHudStream) {
    const queryToken = request.nextUrl.searchParams.get("token");
    const cookieToken = request.cookies.get("hud_token")?.value;

    // First visit with ?token=… — set the cookie and redirect to a clean URL.
    if (queryToken && !cookieToken) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("token");
      const response = NextResponse.redirect(url);
      response.cookies.set("hud_token", queryToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }

    if (cookieToken || queryToken) {
      return NextResponse.next();
    }

    // No token at all → fall through to the admin password gate so an
    // admin can navigate here to mint one.
  }

  // ── Admin password gate (default for everything else) ───────────────
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
