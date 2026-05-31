"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { summarizeActionPayload } from "@/lib/hud-actions";
import type { SeedEvent } from "./activity-feed";
import type { LobeId } from "./lobes";

/**
 * Shared HUD state. Holds the rolling feed for the right-side log AND
 * a per-agent animation queue that <AgentsScene /> drains every frame.
 *
 * One EventSource lives in <HudCanvas /> and pushes into this store.
 * Multiple consumer components subscribe via the hooks below — zustand
 * gives us fine-grained re-renders without prop drilling.
 *
 * Edge-pulse signals are kept OUTSIDE zustand on a module-level Map so
 * AgentOrb can fire them from useFrame without triggering a re-render
 * on every animation tick. Edges read the same Map per frame.
 */

export type AnimationEvent = {
  /** stable id from the originating brain row */
  id: string;
  agent_slug: string;
  source: string | null;
  /** Display title for the packet drop. */
  title: string;
  created_at: string;
};

export type SelectedTarget =
  | { kind: "lobe"; id: LobeId }
  | { kind: "agent"; slug: string }
  | null;

type HudStreamState = {
  feed: SeedEvent[];
  /** Per-agent queue. We never drop — agents drain at their own pace. */
  pendingByAgent: Record<string, AnimationEvent[]>;
  selected: SelectedTarget;
  setSeed: (events: SeedEvent[]) => void;
  pushFeed: (event: SeedEvent) => void;
  queueAnimation: (event: AnimationEvent) => void;
  claimAnimation: (slug: string) => AnimationEvent | null;
  setSelected: (target: SelectedTarget) => void;
};

const FEED_CAP = 40;
const PER_AGENT_CAP = 12;

export const useHudStreamStore = create<HudStreamState>((set, get) => ({
  feed: [],
  pendingByAgent: {},
  selected: null,
  setSeed: (events) => set({ feed: events.slice(0, FEED_CAP) }),
  pushFeed: (event) =>
    set((s) => {
      // Skip duplicates by id — the SSE stream re-sends an event on
      // reconnect occasionally and our seed already contains the last 20.
      if (s.feed.find((e) => "id" in e && e.id === event.id)) return s;
      return { feed: [event, ...s.feed].slice(0, FEED_CAP) };
    }),
  queueAnimation: (event) =>
    set((s) => {
      const current = s.pendingByAgent[event.agent_slug] ?? [];
      // Cap per-agent — under deep-sleep bursts we'd queue too many.
      const next = [...current, event].slice(-PER_AGENT_CAP);
      return {
        pendingByAgent: {
          ...s.pendingByAgent,
          [event.agent_slug]: next,
        },
      };
    }),
  claimAnimation: (slug) => {
    const q = get().pendingByAgent[slug] ?? [];
    if (q.length === 0) return null;
    const [head, ...rest] = q;
    set((s) => ({
      pendingByAgent: { ...s.pendingByAgent, [slug]: rest },
    }));
    return head;
  },
  setSelected: (target) => set({ selected: target }),
}));

// ── Edge pulse signal (module-level, no React state) ──────────────────
// Energies live in this Map, keyed by sorted "lobeA:lobeB". Each frame
// Edges reads + decays them. AgentOrb writes when starting a new path.

const edgePulses = new Map<string, number>();

function edgeKey(a: LobeId | string, b: LobeId | string): string {
  return [a, b].sort().join(":");
}

export function pulseEdge(a: LobeId | string, b: LobeId | string): void {
  edgePulses.set(edgeKey(a, b), 1);
}

export function readEdgePulse(a: LobeId | string, b: LobeId | string): number {
  return edgePulses.get(edgeKey(a, b)) ?? 0;
}

/** Multiplicative decay; called once per frame from Edges. */
export function decayEdgePulses(delta: number): void {
  // Half-life ~0.55s so pulses stay visible for about a second.
  const factor = Math.exp(-delta * 1.25);
  for (const [k, v] of edgePulses) {
    const next = v * factor;
    if (next < 0.015) edgePulses.delete(k);
    else edgePulses.set(k, next);
  }
}

/**
 * Subscribe to the HUD SSE stream. Mount this once at the top of the
 * HUD tree (we do it inside <HudCanvas />). It's idempotent — if it's
 * already connected, subsequent mounts are no-ops.
 */
let activeSource: EventSource | null = null;
let activeRefs = 0;

export function useHudStream(seed: SeedEvent[]) {
  const setSeed = useHudStreamStore((s) => s.setSeed);
  const pushFeed = useHudStreamStore((s) => s.pushFeed);
  const queueAnimation = useHudStreamStore((s) => s.queueAnimation);

  const seeded = useRef(false);
  if (!seeded.current) {
    setSeed(seed);
    seeded.current = true;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    activeRefs += 1;

    if (!activeSource) {
      activeSource = new EventSource("/api/hud/stream");
    }
    const es = activeSource;

    const onEpisode = (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as {
          id: string;
          agent_slug: string;
          source: string | null;
          title: string | null;
          created_at: string;
        };
        const feedEvent: SeedEvent = {
          kind: "episode",
          id: row.id,
          agent_slug: row.agent_slug,
          source: row.source,
          title: row.title ?? "(sin título)",
          created_at: row.created_at,
        };
        pushFeed(feedEvent);
        queueAnimation({
          id: row.id,
          agent_slug: row.agent_slug,
          source: row.source,
          title: row.title ?? "",
          created_at: row.created_at,
        });
      } catch {
        /* ignore malformed */
      }
    };

    const onFinding = (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as {
          id: string;
          title: string;
          importance: string | null;
          created_at: string;
        };
        pushFeed({
          kind: "finding",
          id: row.id,
          title: row.title,
          importance: row.importance ?? "low",
          created_at: row.created_at,
        });
      } catch {
        /* ignore */
      }
    };

    const onAction = (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as {
          id: string;
          device_id: string;
          action_kind: string;
          status: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        const summary = summarizeActionPayload(row.action_kind, row.payload);
        pushFeed({
          kind: "action",
          id: row.id,
          device_id: row.device_id,
          action_kind: row.action_kind,
          status: row.status,
          summary,
          created_at: row.created_at,
        });
        // Fly ATLAS to the Motor lobe to dispatch this action.
        queueAnimation({
          id: row.id,
          agent_slug: "atlas",
          source: "action",
          title: summary,
          created_at: row.created_at,
        });
      } catch {
        /* ignore */
      }
    };

    const onDeepSleep = (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data) as {
          id: string;
          agent_slug: string;
          entities_created: number;
          edges_created: number;
          ran_at: string;
        };
        // Synthesize a feed line for visibility
        pushFeed({
          kind: "episode",
          id: row.id,
          agent_slug: row.agent_slug,
          source: "deep_sleep",
          title: `Deep sleep · ${row.entities_created} entities · ${row.edges_created} edges`,
          created_at: row.ran_at,
        });
        // Trigger a multi-step animation burst for the owning agent
        for (let i = 0; i < Math.min(3, Math.max(1, row.entities_created)); i++) {
          queueAnimation({
            id: `${row.id}-${i}`,
            agent_slug: row.agent_slug,
            source: "deep_sleep",
            title: "consolidating",
            created_at: row.ran_at,
          });
        }
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("episode", onEpisode);
    es.addEventListener("finding", onFinding);
    es.addEventListener("deep_sleep", onDeepSleep);
    es.addEventListener("action", onAction);

    return () => {
      es.removeEventListener("episode", onEpisode);
      es.removeEventListener("finding", onFinding);
      es.removeEventListener("deep_sleep", onDeepSleep);
      es.removeEventListener("action", onAction);
      activeRefs -= 1;
      if (activeRefs <= 0 && activeSource) {
        activeSource.close();
        activeSource = null;
        activeRefs = 0;
      }
    };
  }, [pushFeed, queueAnimation]);
}
