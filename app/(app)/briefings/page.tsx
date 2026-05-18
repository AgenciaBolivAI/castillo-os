import { brainClient } from "@/lib/supabase";

export const metadata = { title: "CastilloOS — Briefings" };
export const dynamic = "force-dynamic";

type Briefing = {
  id: string;
  content: string;
  delivered: boolean;
  delivered_at: string | null;
  created_at: string;
};

function fmt(ts: string): string {
  return new Date(ts).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  });
}

export default async function BriefingsPage() {
  const brain = brainClient();
  const { data, error } = await brain
    .from("briefings")
    .select("id, content, delivered, delivered_at, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  const briefings = (data ?? []) as Briefing[];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Briefings
        </h1>
        <p className="text-sm text-muted mt-1">
          El archivo de tus briefings matutinos. {briefings.length} guardado
          {briefings.length === 1 ? "" : "s"}.
        </p>
      </header>

      {error ? (
        <div className="bg-card border border-red-900/40 rounded-xl p-5 text-sm text-red-400">
          No se pudieron leer los briefings: {error.message}
        </div>
      ) : briefings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="font-medium text-white">Sin briefings todavía</p>
          <p className="text-sm text-muted mt-1">
            El primero llega mañana a las 7am — o ejecuta el workflow
            morning-briefing manualmente.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {briefings.map((b) => (
            <article
              key={b.id}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <time className="text-xs uppercase tracking-wider text-muted2">
                  {fmt(b.created_at)}
                </time>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                    b.delivered
                      ? "bg-green/10 text-green"
                      : "bg-muted2/30 text-muted"
                  }`}
                >
                  {b.delivered ? "Enviado" : "No enviado"}
                </span>
              </div>
              <pre className="text-sm text-text whitespace-pre-wrap break-words font-sans leading-relaxed">
                {b.content}
              </pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
