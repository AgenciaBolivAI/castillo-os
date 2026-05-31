/**
 * IMPORTANT — read this before you change anything.
 *
 * The "lobes" here are NOT anatomical brain regions. They are a UI
 * metaphor that maps to CastilloOS subsystems so the wall display can
 * tell a visual story about what the system is doing. Do not let any
 * marketing copy or customer claim drift toward "biological cognition"
 * or "spiking neurons" — that's theater. The substance is the brain
 * graph, the consolidation pipeline, the skills and routines, the
 * conversation memory. The 3D HUD is a face.
 *
 * Each lobe has a fixed position in a roughly ellipsoidal arrangement,
 * a label that appears on screen, a color, and the subsystem it maps
 * to (used by the agent animations to decide where to fly to).
 */

export type LobeId =
  | "prefrontal"
  | "language"
  | "hippocampus"
  | "sensory"
  | "motor"
  | "reflex"
  | "concept"
  | "brainster"
  | "memory";

export type Lobe = {
  id: LobeId;
  label: string;
  position: [number, number, number];
  color: string;
  /** Roughly the lobe's radius — points and lines respect this. */
  radius: number;
  /** Short caption beneath the label on the HUD. */
  subsystem: string;
};

/**
 * Positions roughly form an ellipsoid centered at the origin. Y is up.
 * Front of the brain is +Z (toward the camera), back is -Z.
 * The brain assembly rotates slowly so every lobe sweeps into view.
 */
export const LOBES: Lobe[] = [
  {
    id: "prefrontal",
    label: "PREFRONTAL",
    subsystem: "ATLAS · chief of staff",
    position: [0, 1.2, 1.6],
    color: "#00e5a0",
    radius: 0.45,
  },
  {
    id: "language",
    label: "LANGUAGE",
    subsystem: "skills router",
    position: [-1.3, 0.4, 1.1],
    color: "#facc15",
    radius: 0.4,
  },
  {
    id: "hippocampus",
    label: "HIPPOCAMPUS",
    subsystem: "brain.entities",
    position: [0, 0.1, 0.2],
    color: "#7dd3fc",
    radius: 0.5,
  },
  {
    id: "sensory",
    label: "SENSORY",
    subsystem: "HERMES · ingest",
    position: [1.4, 0.6, 0.6],
    color: "#3b82f6",
    radius: 0.42,
  },
  {
    id: "motor",
    label: "MOTOR",
    subsystem: "action queue",
    position: [1.0, -0.7, 1.0],
    color: "#fb7185",
    radius: 0.4,
  },
  {
    id: "reflex",
    label: "REFLEX ARC",
    subsystem: "tick schedules",
    position: [-1.0, -0.7, 0.4],
    color: "#ef4444",
    radius: 0.38,
  },
  {
    id: "concept",
    label: "CONCEPT LAYER",
    subsystem: "brain.edges",
    position: [0, 0.6, -0.6],
    color: "#f97316",
    radius: 0.45,
  },
  {
    id: "brainster",
    label: "BRAINSTER",
    subsystem: "deep sleep",
    position: [0, 1.1, -1.3],
    color: "#f472b6",
    radius: 0.42,
  },
  {
    id: "memory",
    label: "MEMORY",
    subsystem: "brain.episodes",
    position: [0, -0.5, -0.5],
    color: "#c084fc",
    radius: 0.5,
  },
];

export const LOBE_BY_ID: Record<LobeId, Lobe> = Object.fromEntries(
  LOBES.map((l) => [l.id, l]),
) as Record<LobeId, Lobe>;

/**
 * Agents and their visual "home" lobes + colors. Used by agents-3d.tsx.
 * The slug must match brain.agents.slug exactly so we can correlate to
 * episode events. The "world" position is for agents that ingest from
 * outside (CLEO, LUNA pull from RSS / ICS feeds).
 */
export type AgentVisual = {
  slug: string;
  name: string;
  color: string;
  home: LobeId | "world";
};

export const AGENT_VISUALS: AgentVisual[] = [
  { slug: "atlas",  name: "ATLAS",  color: "#00e5a0", home: "prefrontal" },
  { slug: "hermes", name: "HERMES", color: "#3b82f6", home: "sensory" },
  { slug: "cleo",   name: "CLEO",   color: "#c084fc", home: "world" },
  { slug: "luna",   name: "LUNA",   color: "#fb923c", home: "world" },
  { slug: "hank",   name: "HANK",   color: "#ef4444", home: "reflex" },
];

export const AGENT_BY_SLUG: Record<string, AgentVisual> = Object.fromEntries(
  AGENT_VISUALS.map((a) => [a.slug, a]),
);

/**
 * "World" position — outside the brain, off to the right. Agents like
 * CLEO and LUNA idle here and fly inward when they ingest something
 * from an external feed.
 */
export const WORLD_POSITION: [number, number, number] = [3.2, 0, 2.5];

/**
 * Animation choreography. Given an event kind, return the sequence of
 * lobe positions an agent's orb should fly through, carrying a "packet"
 * that drops at the final position.
 */
export function pathForEvent(
  agentSlug: string,
  source: string | null,
): LobeId[] | null {
  // Source-driven overrides come first.
  // An action queued by ATLAS lands in the Motor lobe — visual story:
  // "ATLAS dispatched something to the user's machine."
  if (source === "action") return ["motor"];

  switch (agentSlug) {
    case "hermes":
      // tick.json → BolivAI episode lands in Memory via Sensory
      return ["sensory", "memory"];
    case "cleo":
      // Outside world → Sensory → Memory
      return ["sensory", "memory"];
    case "luna":
      // Outside world (calendar) → Memory directly
      return ["memory"];
    case "atlas":
      // Chat turn = the thinking loop: Prefrontal → Hippocampus → Language → Prefrontal
      return ["hippocampus", "language", "prefrontal"];
    case "hank":
      // Reflex arc → quick blip to memory (when HANK is built)
      return ["reflex", "memory"];
    default:
      // Unknown agent — flash through Hippocampus and stop.
      if (source === "rss" || source === "calendar" || source === "school") {
        return ["sensory", "memory"];
      }
      return ["hippocampus"];
  }
}
