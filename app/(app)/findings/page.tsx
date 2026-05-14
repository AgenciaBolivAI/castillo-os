import { brainClient } from "@/lib/supabase";
import { FindingRow, type Finding } from "./finding-row";

export const metadata = { title: "CastilloOS — Findings" };
export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const brain = brainClient();
  const { data, error } = await brain
    .from("findings")
    .select("id, title, detail, importance, status, created_at")
    .in("status", ["new", "surfaced", "acted"])
    .order("created_at", { ascending: false })
    .limit(200);

  const findings = (data ?? []) as Finding[];

  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
          Findings
        </h1>
        <p className="text-sm text-muted mt-1">
          Insights que la flota ha surfaceado. {findings.length} pendiente
          {findings.length === 1 ? "" : "s"}.
        </p>
      </header>

      {error ? (
        <div className="bg-card border border-red-900/40 rounded-xl p-5 text-sm text-red-400">
          No se pudieron leer los findings: {error.message}
        </div>
      ) : findings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="font-medium text-white">Sin findings todavía</p>
          <p className="text-sm text-muted mt-1">
            Aparecen cuando el deep sleep extrae un insight de los episodios.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {findings.map((f) => (
            <FindingRow key={f.id} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}
