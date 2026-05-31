import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hudCookieName, validateHudToken } from "@/lib/hud-auth";

export const metadata = {
  title: "CastilloOS — HUD",
};

// The HUD is meant to live on a kiosk display for months. Keep it fully
// dynamic and never cache — the activity feed and animations depend on
// fresh server data on every full reload.
export const dynamic = "force-dynamic";

export default async function HudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validate the device token server-side. Middleware already let us
  // through if the cookie or query param exists; here we confirm it
  // actually matches an unexpired row in brain.hud_devices.
  const jar = await cookies();
  const token = jar.get(hudCookieName())?.value;
  const device = await validateHudToken(token);
  if (!device) {
    // Token missing or revoked — bounce back to /login so the admin can
    // mint a fresh one from /api/hud/token.
    redirect("/login?from=hud");
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-dark text-text">
      {children}
    </div>
  );
}
