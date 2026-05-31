import { type NextRequest, NextResponse } from "next/server";
import { brainClient } from "@/lib/supabase";
import { hudCookieName, validateHudToken } from "@/lib/hud-auth";

/**
 * Server-Sent Events stream that pushes live brain.* events to the
 * HUD client. The server holds a Postgres connection (via brainClient)
 * and polls every ~1.5s for new rows since the last cursor — this is
 * substantially simpler than running Supabase Realtime in a serverless
 * function and good enough for a wall display where 1-2s latency is
 * indistinguishable from "live."
 *
 * Vercel cuts Node functions at maxDuration; when that happens the
 * browser's EventSource auto-reconnects. The cursor-based query means
 * we never re-emit an event the client already saw across reconnects.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLL_MS = 1500;
const HEARTBEAT_MS = 15000;

export async function GET(req: NextRequest) {
  const token = req.cookies.get(hudCookieName())?.value;
  const device = await validateHudToken(token);
  if (!device) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let cancelled = false;
      req.signal.addEventListener("abort", () => {
        cancelled = true;
      });

      const send = (event: string, data: unknown) => {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          cancelled = true;
        }
      };

      // Initial "connected" event so the client knows the stream is live
      send("connected", { device: device.label, at: new Date().toISOString() });

      const brain = brainClient();

      // Pre-load agent slugs once so we don't re-query on every tick.
      const { data: agents } = await brain.from("agents").select("id, slug");
      const slugById = new Map<string, string>(
        (agents ?? []).map((a) => [a.id as string, (a.slug as string) ?? "atlas"]),
      );

      // Cursors — start from "now" so old data doesn't flood the stream.
      // The HUD page seeded itself with the most recent rows on first
      // paint, so we only want truly new events here.
      const startedAt = new Date().toISOString();
      const cursors = {
        ep: startedAt,
        find: startedAt,
        ds: startedAt,
        act: startedAt,
      };

      const heartbeat = setInterval(() => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`: hb\n\n`));
        } catch {
          cancelled = true;
        }
      }, HEARTBEAT_MS);

      try {
        while (!cancelled) {
          // Episodes
          {
            const { data, error } = await brain
              .from("episodes")
              .select("id, agent_id, source, title, created_at")
              .gt("created_at", cursors.ep)
              .order("created_at", { ascending: true })
              .limit(20);
            if (!error && data) {
              for (const row of data as Array<{
                id: string;
                agent_id: string;
                source: string | null;
                title: string | null;
                created_at: string;
              }>) {
                send("episode", {
                  id: row.id,
                  agent_slug: slugById.get(row.agent_id) ?? "atlas",
                  source: row.source,
                  title: row.title ?? "(sin título)",
                  created_at: row.created_at,
                });
                cursors.ep = row.created_at;
              }
            }
          }

          // Findings
          {
            const { data, error } = await brain
              .from("findings")
              .select("id, title, importance, status, created_at")
              .gt("created_at", cursors.find)
              .order("created_at", { ascending: true })
              .limit(10);
            if (!error && data) {
              for (const row of data as Array<{
                id: string;
                title: string;
                importance: string | null;
                status: string | null;
                created_at: string;
              }>) {
                send("finding", {
                  id: row.id,
                  title: row.title,
                  importance: row.importance ?? "low",
                  created_at: row.created_at,
                });
                cursors.find = row.created_at;
              }
            }
          }

          // Deep sleep runs
          {
            const { data, error } = await brain
              .from("deep_sleep_runs")
              .select("id, agent_id, entities_created, edges_created, ran_at")
              .gt("ran_at", cursors.ds)
              .order("ran_at", { ascending: true })
              .limit(5);
            if (!error && data) {
              for (const row of data as Array<{
                id: string;
                agent_id: string;
                entities_created: number;
                edges_created: number;
                ran_at: string;
              }>) {
                send("deep_sleep", {
                  id: row.id,
                  agent_slug: slugById.get(row.agent_id) ?? "atlas",
                  entities_created: row.entities_created ?? 0,
                  edges_created: row.edges_created ?? 0,
                  ran_at: row.ran_at,
                });
                cursors.ds = row.ran_at;
              }
            }
          }

          // Action queue — newly created automation intents
          {
            const { data, error } = await brain
              .from("action_queue")
              .select("id, device_id, kind, payload, status, created_at")
              .gt("created_at", cursors.act)
              .order("created_at", { ascending: true })
              .limit(10);
            if (!error && data) {
              for (const row of data as Array<{
                id: string;
                device_id: string;
                kind: string;
                payload: Record<string, unknown>;
                status: string;
                created_at: string;
              }>) {
                send("action", {
                  id: row.id,
                  device_id: row.device_id,
                  action_kind: row.kind,
                  status: row.status,
                  payload: row.payload,
                  created_at: row.created_at,
                });
                cursors.act = row.created_at;
              }
            }
          }

          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      // Stream cancelled by the client — nothing to clean up here, the
      // start() loop notices via req.signal.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disables nginx buffering on Vercel — without this the SSE chunks
      // get queued and the HUD feels laggy.
      "X-Accel-Buffering": "no",
    },
  });
}
