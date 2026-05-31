"use client";

import { useEffect, useState } from "react";
import { useHudStreamStore } from "./use-hud-stream";
import { AGENT_BY_SLUG } from "./lobes";

/**
 * Shape of items rendered in the feed. Server seeds an initial batch
 * via /hud/page.tsx; the SSE stream tops it up live.
 */
export type SeedEvent =
  | {
      kind: "episode";
      id: string;
      agent_slug: string;
      source: string | null;
      title: string;
      created_at: string;
    }
  | {
      kind: "finding";
      id: string;
      title: string;
      importance: string;
      created_at: string;
    }
  | {
      kind: "action";
      id: string;
      device_id: string;
      action_kind: string;
      status: string;
      summary: string;
      created_at: string;
    };

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 30_000) return "now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

const IMPORTANCE_DOT: Record<string, string> = {
  high: "#ef4444",
  medium: "#00e5a0",
  low: "#4a5e4c",
};

const ACTION_DOT = "#fb7185"; // matches Motor lobe / agent-MOTOR family

const ACTION_LABEL: Record<string, string> = {
  open_app: "open app",
  open_url: "open url",
  play_spotify: "spotify",
  type_text: "type",
  run_routine: "routine",
  screenshot: "screenshot",
  notify: "notify",
  tts_speak: "speak",
};

export function ActivityFeed({ seed }: { seed: SeedEvent[] }) {
  const feed = useHudStreamStore((s) => s.feed);

  // Re-render every 30s so the "2m ago" timestamps stay fresh.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // The store is seeded by <HudStreamMount /> elsewhere on the page.
  // If we paint before that mount fires, fall back to the server seed.
  const items = feed.length ? feed : seed;

  return (
    <div className="flex-1 min-h-0 bg-card/85 backdrop-blur border border-border-bright rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-[0.25em] text-muted">
        <span>Activity feed</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted">No activity yet — waiting for the brain to fire.</p>
      ) : (
        <ul className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 -mr-1 pr-1">
          {items.map((item) => {
            if (item.kind === "episode") {
              const visual = AGENT_BY_SLUG[item.agent_slug];
              const dot = visual?.color ?? "#4a5e4c";
              return (
                <li
                  key={`ep-${item.id}`}
                  className="flex items-start gap-2 text-xs leading-snug"
                >
                  <span
                    className="mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: dot,
                      boxShadow: `0 0 4px ${dot}`,
                    }}
                  />
                  <span className="text-muted2 uppercase tracking-wider text-[10px] font-bold shrink-0 w-12">
                    {visual?.name ?? item.agent_slug}
                  </span>
                  <span className="flex-1 text-text truncate">{item.title}</span>
                  <span className="text-muted2 text-[10px] tabular-nums shrink-0">
                    {relativeTime(item.created_at)}
                  </span>
                </li>
              );
            }
            if (item.kind === "action") {
              return (
                <li
                  key={`a-${item.id}`}
                  className="flex items-start gap-2 text-xs leading-snug"
                >
                  <span
                    className="mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: ACTION_DOT,
                      boxShadow: `0 0 4px ${ACTION_DOT}`,
                    }}
                  />
                  <span className="text-muted2 uppercase tracking-wider text-[10px] font-bold shrink-0 w-12">
                    ACT
                  </span>
                  <span className="flex-1 text-text truncate">
                    <span className="text-muted2 mr-1">
                      {ACTION_LABEL[item.action_kind] ?? item.action_kind}:
                    </span>
                    {item.summary}
                  </span>
                  <span className="text-muted2 text-[10px] tabular-nums shrink-0">
                    {relativeTime(item.created_at)}
                  </span>
                </li>
              );
            }
            const dot = IMPORTANCE_DOT[item.importance] ?? "#4a5e4c";
            return (
              <li
                key={`f-${item.id}`}
                className="flex items-start gap-2 text-xs leading-snug"
              >
                <span
                  className="mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: dot,
                    boxShadow: `0 0 4px ${dot}`,
                  }}
                />
                <span className="text-muted2 uppercase tracking-wider text-[10px] font-bold shrink-0 w-12">
                  FIND
                </span>
                <span className="flex-1 text-text truncate">{item.title}</span>
                <span className="text-muted2 text-[10px] tabular-nums shrink-0">
                  {relativeTime(item.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
