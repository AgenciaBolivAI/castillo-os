import { createHash, randomBytes } from "node:crypto";
import { brainClient } from "@/lib/supabase";

/**
 * HUD device tokens. Separate from the admin password cookie so a wall
 * display can stay logged in for a year and so revoking one device
 * doesn't kick the admin out of /findings or /briefings.
 *
 *   raw token (32 random bytes, hex)  →  sha256 hash  →  brain.hud_devices.token_hash
 *
 * The raw token is shown to the admin exactly once when minted. Only
 * the hash is stored. There is no recovery — lose the token, mint a
 * new one and revoke the old.
 */

const HUD_COOKIE = "hud_token";
const TOKEN_BYTES = 32;

export function hudCookieName(): string {
  return HUD_COOKIE;
}

export function mintToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("hex");
  const hash = sha256(raw);
  return { raw, hash };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Validate a raw token against brain.hud_devices. Returns the device
 * row if valid + unexpired, null otherwise. Best-effort updates
 * last_seen so admins can tell which devices are alive.
 */
export async function validateHudToken(rawToken: string | undefined | null) {
  if (!rawToken || rawToken.length < 32) return null;

  const hash = sha256(rawToken);
  const brain = brainClient();

  const { data, error } = await brain
    .from("hud_devices")
    .select("id, label, expires_at")
    .eq("token_hash", hash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  // Fire-and-forget — don't block the page on this.
  brain
    .from("hud_devices")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return data as { id: string; label: string; expires_at: string };
}
