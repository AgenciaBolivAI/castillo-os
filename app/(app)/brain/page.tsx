import { brainClient } from "@/lib/supabase";
import { BrainGraph, type GraphNode, type GraphLink } from "./brain-graph";

export const metadata = { title: "CastilloOS — Brain Graph" };
export const dynamic = "force-dynamic";

// entity type → node color
const TYPE_COLOR: Record<string, string> = {
  person: "#7dd3fc",
  project: "#00e5a0",
  company: "#f4a261",
  concept: "#c084fc",
  task: "#fb7185",
  event: "#facc15",
  place: "#34d399",
  tool: "#a78bfa",
};

export default async function BrainPage() {
  const brain = brainClient();

  const [{ data: entities, error: entErr }, { data: edges, error: edgeErr }] =
    await Promise.all([
      brain
        .from("entities")
        .select("id, name, type, mention_count")
        .order("mention_count", { ascending: false })
        .limit(1000),
      brain.from("edges").select("from_entity, to_entity, relation, weight"),
    ]);

  const error = entErr || edgeErr;

  const nodes: GraphNode[] = (entities ?? []).map((e: any) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    mention_count: e.mention_count ?? 1,
    color: TYPE_COLOR[e.type] ?? "#00e5a0",
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = (edges ?? [])
    .filter((e: any) => nodeIds.has(e.from_entity) && nodeIds.has(e.to_entity))
    .map((e: any) => ({
      source: e.from_entity,
      target: e.to_entity,
      relation: e.relation,
      weight: e.weight ?? 1,
    }));

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="mb-4 md:mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Brain Graph
        </h1>
        <p className="text-sm text-muted mt-1">
          El conocimiento que la flota ha consolidado. Crece con cada deep
          sleep.
        </p>
      </header>

      {error ? (
        <div className="bg-card border border-red-900/40 rounded-xl p-5 text-sm text-red-400">
          No se pudo leer el grafo: {error.message}
          <p className="text-muted2 mt-2">
            ¿Expusiste el schema <code>brain</code> en Supabase → Settings → API?
          </p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="font-medium text-white">El grafo está vacío</p>
          <p className="text-sm text-muted mt-1">
            Corre el tick para ingerir episodios y luego deep sleep para
            extraer entidades. El grafo se llena solo.
          </p>
        </div>
      ) : (
        <BrainGraph nodes={nodes} links={links} />
      )}
    </div>
  );
}
