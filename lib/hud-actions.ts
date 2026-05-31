/**
 * Compact one-liner for an action row, used by the activity feed and
 * the agent-orb label tooltip. Keep it ≤ 60 chars so it doesn't blow
 * out the HUD's right-side panel.
 *
 * Module is neutral (no "use client") so both the server page seed
 * and the client SSE hook can import it.
 */
export function summarizeActionPayload(
  kind: string,
  payload: Record<string, unknown> | null | undefined,
): string {
  const p = payload ?? {};
  switch (kind) {
    case "open_app":
      return String(p.app ?? "(unknown app)");
    case "open_url":
      return String(p.url ?? "(no url)").slice(0, 60);
    case "play_spotify":
      return String(p.query ?? p.uri ?? "(spotify)");
    case "run_routine":
      return String(p.slug ?? "(routine)");
    case "type_text": {
      const t = String(p.text ?? "");
      return t.length > 40 ? t.slice(0, 40) + "…" : t;
    }
    case "notify":
      return String(p.title ?? p.body ?? "(notify)");
    case "tts_speak": {
      const t = String(p.text ?? "");
      return t.length > 40 ? t.slice(0, 40) + "…" : t;
    }
    case "screenshot":
      return "screen";
    default:
      return kind;
  }
}
