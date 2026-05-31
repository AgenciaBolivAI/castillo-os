import { brainClient } from "@/lib/supabase";
import { summarizeActionPayload } from "@/lib/hud-actions";
import { HudCanvas } from "./hud-canvas";
import { ActivityFeed, type SeedEvent } from "./activity-feed";
import { StatusPanels } from "./status-panels";
import { HudClock } from "./hud-clock";
import { InspectorPanel } from "./inspector-panel";

type FleetRow = {
  slug: string | null;
  name: string | null;
  role: string | null;
  ep: number | null;
  ent: number | null;
  find: number | null;
  ds: number | null;
  last_tick_at: string | null;
  last_deep_sleep_at: string | null;
};

type EpisodeRow = {
  id: string;
  agent_id: string;
  source: string | null;
  title: string | null;
  created_at: string;
};

type FindingRow = {
  id: string;
  title: string;
  importance: string | null;
  status: string | null;
  created_at: string;
};

type AgentLookup = { id: string; slug: string };

type ActionRow = {
  id: string;
  device_id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

async function loadHudData() {
  const brain = brainClient();

  const [
    { data: fleet, error: fleetErr },
    { data: agents },
    { data: episodes },
    { data: findings },
    { data: actions },
    { data: weekEpisodes },
  ] = await Promise.all([
    brain.rpc("fleet_stats"),
    brain.from("agents").select("id, slug"),
    brain.from("episodes").select("id, agent_id, source, title, created_at").order("created_at", { ascending: false }).limit(15),
    brain.from("findings").select("id, title, importance, status, created_at").in("status", ["new", "surfaced", "acted"]).order("created_at", { ascending: false }).limit(8),
    brain.from("action_queue").select("id, device_id, kind, payload, status, created_at").order("created_at", { ascending: false }).limit(10),
    brain.from("episodes").select("id, created_at").gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
  ]);

  const agentBySlug = new Map<string, string>();
  for (const a of (agents ?? []) as AgentLookup[]) {
    agentBySlug.set(a.id, a.slug);
  }

  const seed: SeedEvent[] = [
    ...((episodes ?? []) as EpisodeRow[]).map((e) => ({
      kind: "episode" as const,
      id: e.id,
      agent_slug: agentBySlug.get(e.agent_id) ?? "atlas",
      source: e.source,
      title: e.title ?? "(sin título)",
      created_at: e.created_at,
    })),
    ...((findings ?? []) as FindingRow[]).map((f) => ({
      kind: "finding" as const,
      id: f.id,
      title: f.title,
      importance: f.importance ?? "low",
      created_at: f.created_at,
    })),
    ...((actions ?? []) as ActionRow[]).map((a) => ({
      kind: "action" as const,
      id: a.id,
      device_id: a.device_id,
      action_kind: a.kind,
      status: a.status,
      summary: summarizeActionPayload(a.kind, a.payload),
      created_at: a.created_at,
    })),
  ]
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    .slice(0, 25);

  return {
    fleet: (fleet ?? []) as FleetRow[],
    fleetError: fleetErr?.message ?? null,
    weekCount: weekEpisodes?.length ?? 0,
    findingsCount: findings?.length ?? 0,
    seed,
  };
}

export default async function HudPage() {
  const { fleet, fleetError, weekCount, findingsCount, seed } = await loadHudData();

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Background brain canvas — fills the viewport */}
      <HudCanvas seed={seed} />

      {/* Vignette overlay so panels read against the brain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(8,11,9,0.55) 70%, rgba(8,11,9,0.85) 100%)",
        }}
      />

      {/* Top bar — title + clock */}
      <header className="absolute top-0 inset-x-0 px-6 pt-5 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted z-20">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="font-display font-extrabold tracking-tight text-text text-base">
            Castillo<span className="text-green">OS</span>
          </span>
          <span className="text-muted2">·</span>
          <span>Neural HUD · live</span>
        </div>
        <HudClock />
      </header>

      {/* Left column — KPIs */}
      <aside className="absolute left-6 top-20 bottom-20 w-72 max-w-[28vw] hidden md:flex flex-col gap-3 z-20">
        <StatusPanels.Last7Days weekCount={weekCount} findingsCount={findingsCount} />
        <StatusPanels.AgentRoster fleet={fleet} error={fleetError} />
      </aside>

      {/* Right column — activity feed */}
      <aside className="absolute right-6 top-20 bottom-20 w-80 max-w-[28vw] hidden md:flex flex-col gap-3 z-20">
        <StatusPanels.SystemStatus />
        <ActivityFeed seed={seed} />
      </aside>

      {/* Click-inspect overlay — only visible when a lobe or agent is selected */}
      <InspectorPanel />

      {/* Bottom subtitle */}
      <footer className="absolute bottom-3 inset-x-0 flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-muted2 z-20">
        <span>Brain online · listening for &quot;Hey Atlas&quot; · scroll to zoom · drag to orbit · click a lobe or agent</span>
      </footer>
    </div>
  );
}
