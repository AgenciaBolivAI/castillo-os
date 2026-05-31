import { type NextRequest, NextResponse } from "next/server";
import { brainClient } from "@/lib/supabase";
import { mintToken } from "@/lib/hud-auth";

/**
 * Mint a new HUD device token.
 *
 * Auth: this route lives behind the same password gate as the rest of
 * the dashboard — middleware already requires the `castillo_os` cookie
 * for /api/hud/token, so reaching here implies an authenticated admin.
 *
 * Flow:
 *   POST /api/hud/token  body: { label?: string }
 *   → { token: "<raw 64-char hex>", label, expires_at }
 *
 * The raw token is shown EXACTLY ONCE. Paste it into the wall display:
 *   https://os.bolivai.com/hud?token=<raw>
 *
 * The HUD page sets a long-lived cookie from the query param and the
 * raw token never has to appear in a URL again.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { label?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const label =
    typeof body.label === "string" && body.label.trim().length > 0
      ? body.label.trim().slice(0, 80)
      : "unnamed";

  const { raw, hash } = mintToken();
  const brain = brainClient();

  const { data, error } = await brain
    .from("hud_devices")
    .insert({
      token_hash: hash,
      label,
    })
    .select("id, label, expires_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    token: raw,
    label: data.label,
    expires_at: data.expires_at,
    hint: `Visit /hud?token=${raw} on the wall display once to bind the device.`,
  });
}
