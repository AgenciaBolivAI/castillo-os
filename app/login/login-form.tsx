"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "@/lib/actions";

const initial: AuthState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-[11px] uppercase tracking-wider text-muted font-semibold"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="bg-surface border border-border rounded-lg px-3.5 py-3 text-base sm:text-sm
                     focus:outline-none focus:border-green transition-colors"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-green text-black font-display font-bold text-base sm:text-sm rounded-lg
                   py-3.5 mt-1 transition-all hover:bg-green-dim active:bg-green-dim disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
