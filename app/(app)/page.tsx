import { brainClient } from "@/lib/supabase";

export const metadata = { title: "CastilloOS — Fleet" };
export const dynamic = "force-dynamic";

type FleetRow = {
  agent_id: string;
  slug: string;
  name: string;
  role: string;
  status: string;
  color: string;
  last_tick_at: string | null;
  last_deep_sleep_at: string | null;
  ep: number;
  ent: number;
  find: number;
  ds: number;
};

function ago(ts: string | null): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function FleetPage() {
  const brain = brainClient();
  const { data, error } = await brain.rpc("fleet_stats");
  const rows = (data ?? []) as FleetRow[];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Agent Fleet
        </h1>
        <p className="text-sm text-muted mt-1">
          {rows.length} agente{rows.length === 1 ? "" : "s"} · EP episodes ·
          ENT entities · FIND findings · DS deep sleeps
        </p>
      </header>

      {error ? (
        <div className="bg-card border border-red-900/40 rounded-xl p-5 text-sm text-red-400">
          No se pudo leer <code>brain.fleet_stats()</code>: {error.message}
          <p className="text-muted2 mt-2">
            ¿Expusiste el schema <code>brain</code> en Supabase → Settings → API
            → Exposed schemas?
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="font-medium text-white">Sin agentes todavía</p>
          <p className="text-sm text-muted mt-1">
            Aplica <code>brain-schema.sql</code> — siembra 5 agentes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((a) => (
            <div
              key={a.agent_id}
              className="bg-card border border-border rounded-xl p-5 transition-colors hover:border-border-bright"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: a.color }}
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-white truncate">
                      {a.name}
                    </div>
                    <div className="text-xs text-muted truncate">{a.role}</div>
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    a.status === "active"
                      ? "bg-green/10 text-green"
                      : "bg-muted2/30 text-muted"
                  }`}
                >
                  {a.status === "active" ? "OK" : a.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {(
                  [
                    ["EP", a.ep],
                    ["ENT", a.ent],
                    ["FIND", a.find],
                    ["DS", a.ds],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="text-center">
                    <div className="font-display text-xl font-extrabold text-white tabular-nums">
                      {val}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted2 mt-0.5">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-[11px] text-muted2 border-t border-border pt-3">
                <span>tick {ago(a.last_tick_at)}</span>
                <span>sleep {ago(a.last_deep_sleep_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
