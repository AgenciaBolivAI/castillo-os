"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRoutine, type RoutineFormState } from "@/lib/actions";

type InitialValues = {
  slug: string;
  name: string;
  description: string;
  steps: Record<string, unknown>[];
  active: boolean;
};

const INITIAL_STATE: RoutineFormState = { ok: false, error: null };

const STEP_KINDS = [
  "open_app",
  "open_url",
  "play_spotify",
  "type_text",
  "screenshot",
  "notify",
  "tts_speak",
] as const;

export function RoutineForm({
  mode,
  initial,
  originalSlug,
  onSaved,
}: {
  mode: "create" | "edit";
  initial: InitialValues;
  originalSlug?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveRoutine, INITIAL_STATE);

  // Local form state — controlled inputs so the JSON textarea can be
  // pretty-printed and validated on the client before submit.
  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [stepsText, setStepsText] = useState(
    JSON.stringify(initial.steps ?? [], null, 2),
  );
  const [active, setActive] = useState(initial.active);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      onSaved?.();
      router.refresh();
    }
  }, [state.ok, onSaved, router]);

  function validateBeforeSubmit() {
    setClientError(null);
    try {
      const parsed = JSON.parse(stepsText);
      if (!Array.isArray(parsed)) throw new Error("must be an array");
      const allowed = STEP_KINDS as readonly string[];
      for (let i = 0; i < parsed.length; i++) {
        const s = parsed[i];
        if (typeof s?.kind !== "string" || !allowed.includes(s.kind)) {
          throw new Error(`step ${i + 1}: invalid kind`);
        }
      }
    } catch (e) {
      setClientError(`steps: ${(e as Error).message}`);
      return false;
    }
    return true;
  }

  function prettifySteps() {
    try {
      setStepsText(JSON.stringify(JSON.parse(stepsText), null, 2));
      setClientError(null);
    } catch (e) {
      setClientError(`steps: ${(e as Error).message}`);
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!validateBeforeSubmit()) e.preventDefault();
      }}
      className="space-y-3"
    >
      {originalSlug ? (
        <input type="hidden" name="original_slug" value={originalSlug} />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="slug" hint="lowercase, hyphens only">
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="start-of-day"
            disabled={mode === "edit"}
            className="w-full text-sm px-3 py-2 rounded-md bg-bg border border-border
                       text-text focus:border-green focus:outline-none
                       disabled:opacity-60 disabled:cursor-not-allowed font-mono"
          />
        </Field>
        <Field label="name" hint="spoken aloud sometimes">
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Start of day"
            className="w-full text-sm px-3 py-2 rounded-md bg-bg border border-border
                       text-text focus:border-green focus:outline-none"
          />
        </Field>
      </div>

      <Field
        label="description"
        hint="how ATLAS matches the user's intent — task-shaped, not poetic"
      >
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="The morning kickoff — opens Cursor, brings up the HUD, starts focus music."
          className="w-full text-sm px-3 py-2 rounded-md bg-bg border border-border
                     text-text focus:border-green focus:outline-none resize-y"
        />
      </Field>

      <Field
        label="steps"
        hint={`JSON array of {kind, payload}. kind ∈ ${STEP_KINDS.join(" / ")}`}
      >
        <div className="relative">
          <textarea
            name="steps"
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={Math.min(Math.max(stepsText.split("\n").length, 6), 18)}
            spellCheck={false}
            className="w-full text-xs px-3 py-2 rounded-md bg-bg border border-border
                       text-text focus:border-green focus:outline-none font-mono leading-relaxed"
          />
          <button
            type="button"
            onClick={prettifySteps}
            className="absolute top-2 right-2 text-[10px] uppercase tracking-wider
                       px-2 py-1 rounded border border-border-bright text-muted
                       hover:text-green hover:border-green transition-colors"
          >
            Prettify
          </button>
        </div>
      </Field>

      <label className="flex items-center gap-2 text-xs text-text/90">
        <input
          type="checkbox"
          name="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-green"
        />
        Active — visible in ATLAS&apos;s routine menu
      </label>

      {(clientError || state.error) ? (
        <p className="text-xs text-red-400">{clientError ?? state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-xs text-green">Saved.</p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="text-sm px-4 py-2 rounded-md border border-green/50 bg-green/10
                     text-green hover:bg-green/20 transition-colors disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save routine"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
          {label}
        </span>
        {hint ? (
          <span className="text-[10px] text-muted2 italic ml-2">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
