import { brainClient } from "@/lib/supabase";
import { RoutineCard, type Routine } from "./routine-card";
import { NewRoutineButton } from "./new-routine-button";

export const metadata = { title: "CastilloOS — Routines" };
export const dynamic = "force-dynamic";

export default async function RoutinesPage() {
  const brain = brainClient();
  const { data, error } = await brain
    .from("routines")
    .select("slug, name, description, steps, active, created_at, updated_at")
    .order("created_at", { ascending: true });

  const routines = (data ?? []) as Routine[];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      <header className="mb-6 md:mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Routines
          </h1>
          <p className="text-sm text-muted mt-1">
            Named action sequences ATLAS fires when you describe them by voice.
            {routines.length} routine{routines.length === 1 ? "" : "s"}.
          </p>
        </div>
        <NewRoutineButton />
      </header>

      {error ? (
        <div className="bg-card border border-red-900/40 rounded-xl p-5 text-sm text-red-400">
          Couldn&apos;t load routines: {error.message}
        </div>
      ) : routines.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="font-medium text-white">No routines yet</p>
          <p className="text-sm text-muted mt-1">
            Apply <code className="text-green">schema/brain-routines.sql</code> to
            seed start-of-day / deep-work / wind-down, or hit{" "}
            <span className="text-green">+ New routine</span> above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((r) => (
            <RoutineCard key={r.slug} routine={r} />
          ))}
        </div>
      )}

      <section className="mt-10 text-xs text-muted2 space-y-2 leading-relaxed">
        <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted">
          How ATLAS triggers a routine
        </h2>
        <p>
          The <span className="text-text/90">description</span> is what the LLM
          matches the user&apos;s phrase against — keep it task-shaped
          (&quot;the morning kickoff&quot;), not poetic. When ATLAS recognizes
          intent it emits a tag in its reply that&apos;s stripped before TTS,
          and{" "}
          <code className="text-text/85">brain.queue_routine(slug, device_id)</code>{" "}
          expands the steps into <code className="text-text/85">brain.action_queue</code>.
        </p>
        <p>
          Valid step kinds: <code className="text-text/85">open_app, open_url,
          play_spotify, type_text, screenshot, notify, tts_speak</code>. Routines
          can&apos;t nest other routines in v1.
        </p>
      </section>
    </div>
  );
}
