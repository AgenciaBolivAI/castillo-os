"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { brainClient } from "@/lib/supabase";

export type AuthState = { error: string | null };

// ─── Login ───────────────────────────────────────────────────────────
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  if (!password || password !== process.env.CASTILLO_OS_PASSWORD) {
    return { error: "Contraseña incorrecta" };
  }

  const secret = process.env.CASTILLO_OS_COOKIE_SECRET;
  if (!secret) {
    return { error: "Falta CASTILLO_OS_COOKIE_SECRET en el servidor" };
  }

  const jar = await cookies();
  jar.set("castillo_os", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/");
}

// ─── Logout ──────────────────────────────────────────────────────────
export async function logoutAction() {
  const jar = await cookies();
  jar.delete("castillo_os");
  redirect("/login");
}

// ─── Mark a finding's status ─────────────────────────────────────────
export async function updateFindingStatus(id: string, status: string) {
  const valid = ["new", "surfaced", "dismissed", "acted"];
  if (!valid.includes(status)) return;
  const brain = brainClient();
  await brain.from("findings").update({ status }).eq("id", id);
}

// ─── Routines CRUD ───────────────────────────────────────────────────
// brain.routines holds named action sequences ATLAS can fire when the
// user describes them. The editor at /routines lets the owner add,
// rename, toggle, delete, and test-fire them without going into psql.

const ROUTINE_KINDS = new Set([
  "open_app",
  "open_url",
  "play_spotify",
  "type_text",
  "screenshot",
  "notify",
  "tts_speak",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,40}[a-z0-9]$/;

export type RoutineFormState = {
  ok: boolean;
  error: string | null;
  slug?: string;
};

type StepInput = { kind?: unknown; payload?: unknown };

function validateSteps(raw: unknown): { ok: true; steps: object[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "steps must be a JSON array" };
  }
  if (raw.length === 0) {
    return { ok: false, error: "at least one step required" };
  }
  if (raw.length > 24) {
    return { ok: false, error: "max 24 steps per routine" };
  }
  const out: object[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] as StepInput;
    if (!s || typeof s !== "object") {
      return { ok: false, error: `step ${i + 1}: must be an object` };
    }
    if (typeof s.kind !== "string" || !ROUTINE_KINDS.has(s.kind)) {
      return {
        ok: false,
        error: `step ${i + 1}: kind must be one of ${[...ROUTINE_KINDS].join(", ")}`,
      };
    }
    const payload =
      s.payload === undefined || s.payload === null ? {} : s.payload;
    if (typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, error: `step ${i + 1}: payload must be an object` };
    }
    out.push({ kind: s.kind, payload });
  }
  return { ok: true, steps: out };
}

export async function saveRoutine(
  _prev: RoutineFormState,
  formData: FormData,
): Promise<RoutineFormState> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const originalSlug = String(formData.get("original_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const stepsRaw = String(formData.get("steps") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "slug must be lowercase letters / digits / hyphens (no leading/trailing hyphen)",
    };
  }
  if (!name) return { ok: false, error: "name required" };
  if (!description) return { ok: false, error: "description required" };
  if (description.length > 240) {
    return { ok: false, error: "description too long (max 240 chars)" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stepsRaw);
  } catch (e) {
    return { ok: false, error: `steps is not valid JSON: ${(e as Error).message}` };
  }
  const validated = validateSteps(parsed);
  if (!validated.ok) return { ok: false, error: validated.error };

  const brain = brainClient();
  // Rename support: if originalSlug exists and differs, delete the old
  // row after the new one is in. Postgres unique(slug) blocks the upsert
  // if both rows coexist, so we update-by-original first when possible.
  if (originalSlug && originalSlug !== slug) {
    const { error: upErr } = await brain
      .from("routines")
      .update({
        slug,
        name,
        description,
        steps: validated.steps,
        active,
      })
      .eq("slug", originalSlug);
    if (upErr) {
      return { ok: false, error: `update failed: ${upErr.message}` };
    }
  } else {
    const { error: upErr } = await brain
      .from("routines")
      .upsert(
        {
          slug,
          name,
          description,
          steps: validated.steps,
          active,
        },
        { onConflict: "slug" },
      );
    if (upErr) {
      return { ok: false, error: `save failed: ${upErr.message}` };
    }
  }

  return { ok: true, error: null, slug };
}

export async function deleteRoutine(slug: string) {
  if (!SLUG_RE.test(slug)) return;
  const brain = brainClient();
  await brain.from("routines").delete().eq("slug", slug);
}

export async function toggleRoutineActive(slug: string, active: boolean) {
  if (!SLUG_RE.test(slug)) return;
  const brain = brainClient();
  await brain.from("routines").update({ active }).eq("slug", slug);
}

/**
 * Test-fire a routine against the given device_id. Calls the same
 * brain.queue_routine RPC that atlas-desktop uses, so the steps land
 * in brain.action_queue and the desktop client picks them up within
 * 1.5s. Returns how many rows were inserted (or null on failure).
 */
export async function testRunRoutine(
  slug: string,
  deviceId: string,
): Promise<{ queued: number | null; error: string | null }> {
  if (!SLUG_RE.test(slug)) {
    return { queued: null, error: "invalid slug" };
  }
  const clean = deviceId.trim();
  if (!clean) return { queued: null, error: "device_id required" };
  const brain = brainClient();
  const { data, error } = await brain.rpc("queue_routine", {
    p_slug: slug,
    p_device_id: clean,
  });
  if (error) return { queued: null, error: error.message };
  return { queued: typeof data === "number" ? data : null, error: null };
}
