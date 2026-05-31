"use client";

/**
 * Inspector panel — appears when the user clicks a lobe or an agent
 * orb in the 3D HUD. Sits as a floating card centered above the footer
 * with translucent dark glass styling, matches the existing status
 * panels. Click anywhere in empty 3D space (via hud-canvas's
 * onPointerMissed) clears the selection and closes the panel.
 */

import { useHudStreamStore } from "./use-hud-stream";
import {
  AGENT_BY_SLUG,
  AGENT_VISUALS,
  LOBE_BY_ID,
  LOBES,
  type LobeId,
} from "./lobes";
import { EDGE_PAIRS } from "./brain-3d";
import type { SeedEvent } from "./activity-feed";

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 30_000) return "now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

/**
 * Loose source→lobe map for filtering the recent-activity list when a
 * lobe is selected. NOT exhaustive — covers the sources we actually
 * stream from atlas-chat/telegram/desktop, HERMES, CLEO, LUNA, and
 * deep-sleep. Unknown sources fall through to "memory" since every
 * episode is ultimately stored there.
 */
function sourceMatchesLobe(source: string | null, lobeId: LobeId): boolean {
  if (!source) return lobeId === "memory";
  if (lobeId === "memory") return true;
  if (lobeId === "sensory") {
    return ["bolivai_db", "rss", "calendar", "school", "ics", "gmail"].includes(source);
  }
  if (lobeId === "prefrontal") {
    return ["whatsapp", "telegram", "desktop"].includes(source);
  }
  if (lobeId === "brainster") return source === "deep_sleep";
  if (lobeId === "motor") return false; // actions handled separately
  return false;
}

function filterForLobe(feed: SeedEvent[], lobeId: LobeId): SeedEvent[] {
  return feed
    .filter((e) => {
      if (lobeId === "motor" && e.kind === "action") return true;
      if (e.kind === "episode") return sourceMatchesLobe(e.source, lobeId);
      return false;
    })
    .slice(0, 6);
}

function filterForAgent(feed: SeedEvent[], slug: string): SeedEvent[] {
  return feed
    .filter((e) => {
      if (e.kind === "episode") return e.agent_slug === slug;
      // ATLAS owns the action queue
      if (e.kind === "action") return slug === "atlas";
      return false;
    })
    .slice(0, 6);
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-white/15"
      style={{ background: color }}
    />
  );
}

function ActivityList({ events }: { events: SeedEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[11px] text-muted2 italic">No hay actividad reciente aquí.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {events.map((e) => {
        const title =
          e.kind === "episode"
            ? e.title
            : e.kind === "action"
              ? e.summary
              : e.title;
        const tag =
          e.kind === "episode"
            ? e.source ?? "?"
            : e.kind === "action"
              ? e.action_kind
              : "finding";
        return (
          <li
            key={e.kind + ":" + e.id}
            className="flex items-start gap-2 text-[11px] text-text/90 leading-snug"
          >
            <span className="text-muted2 tabular-nums w-8 shrink-0">
              {relativeTime(e.created_at)}
            </span>
            <span className="text-muted shrink-0 uppercase tracking-wide text-[9px] w-16 truncate">
              {tag}
            </span>
            <span className="truncate">{title}</span>
          </li>
        );
      })}
    </ul>
  );
}

function LobeInspector({ lobeId }: { lobeId: LobeId }) {
  const lobe = LOBE_BY_ID[lobeId];
  const feed = useHudStreamStore((s) => s.feed);
  if (!lobe) return null;

  const owner = AGENT_VISUALS.find((a) => a.home === lobeId);
  const neighbors = EDGE_PAIRS.flatMap(([a, b]) => {
    if (a === lobeId) return [LOBE_BY_ID[b]];
    if (b === lobeId) return [LOBE_BY_ID[a]];
    return [];
  });
  const activity = filterForLobe(feed, lobeId);

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <ColorSwatch color={lobe.color} />
        <h3 className="font-display text-base tracking-tight text-text">
          {lobe.label}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted2">
          lobe
        </span>
      </div>
      <p className="text-xs text-muted leading-snug mb-3">
        {lobe.subsystem}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted2 mb-1">
            Owner
          </div>
          {owner ? (
            <div className="flex items-center gap-1.5 text-text/90">
              <ColorSwatch color={owner.color} />
              {owner.name}
            </div>
          ) : (
            <span className="text-muted2 italic">(shared / system)</span>
          )}
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted2 mb-1">
            Connections
          </div>
          {neighbors.length ? (
            <div className="flex flex-wrap gap-1.5">
              {neighbors.map((n) => (
                <span
                  key={n.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-text/85"
                >
                  <ColorSwatch color={n.color} />
                  {n.label}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted2 italic">none</span>
          )}
        </div>
      </div>

      <div className="text-[9px] uppercase tracking-[0.2em] text-muted2 mb-1.5">
        Recent activity
      </div>
      <ActivityList events={activity} />
    </>
  );
}

function AgentInspector({ slug }: { slug: string }) {
  const agent = AGENT_BY_SLUG[slug];
  const feed = useHudStreamStore((s) => s.feed);
  const pendingByAgent = useHudStreamStore((s) => s.pendingByAgent);
  if (!agent) return null;

  const home =
    agent.home === "world" ? null : LOBE_BY_ID[agent.home];
  const activity = filterForAgent(feed, slug);
  const queued = (pendingByAgent[slug] ?? []).length;

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <ColorSwatch color={agent.color} />
        <h3 className="font-display text-base tracking-tight text-text">
          {agent.name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted2">
          agent
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted2 mb-1">
            Home
          </div>
          {home ? (
            <div className="flex items-center gap-1.5 text-text/90">
              <ColorSwatch color={home.color} />
              {home.label}
            </div>
          ) : (
            <span className="text-text/85">(outside world)</span>
          )}
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted2 mb-1">
            In flight
          </div>
          <div className="text-text/90 tabular-nums">
            {queued} {queued === 1 ? "task" : "tasks"}
          </div>
        </div>
      </div>

      <div className="text-[9px] uppercase tracking-[0.2em] text-muted2 mb-1.5">
        Recent activity
      </div>
      <ActivityList events={activity} />
    </>
  );
}

export function InspectorPanel() {
  const selected = useHudStreamStore((s) => s.selected);
  const setSelected = useHudStreamStore((s) => s.setSelected);
  if (!selected) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-16 z-30 w-[28rem] max-w-[92vw] pointer-events-auto">
      <div className="bg-card/90 backdrop-blur-md border border-border-bright rounded-lg p-4 shadow-2xl">
        <button
          type="button"
          aria-label="Close inspector"
          onClick={() => setSelected(null)}
          className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded text-muted hover:text-text hover:bg-white/10 transition text-sm leading-none"
        >
          ×
        </button>
        {selected.kind === "lobe" ? (
          <LobeInspector lobeId={selected.id} />
        ) : (
          <AgentInspector slug={selected.slug} />
        )}
      </div>
    </div>
  );
}

// Sanity guard during dev — make sure the LOBES export stayed in sync.
void LOBES;
