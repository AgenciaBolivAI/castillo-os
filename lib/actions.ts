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
