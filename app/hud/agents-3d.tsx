"use client";

/**
 * Animated agent characters — the "visual hook" of the HUD.
 *
 * Each named agent in CastilloOS (ATLAS, HERMES, CLEO, LUNA, HANK) is
 * a small glowing orb that idles near a home position and flies along
 * a bezier path between lobes when something happens to it:
 *
 *   • HERMES gets a new BolivAI episode  →  Sensory → Memory drop
 *   • CLEO drops a news headline         →  World → Sensory → Memory
 *   • LUNA pulls a calendar event        →  World → Memory
 *   • ATLAS answers a chat turn          →  Prefrontal → Hippocampus → Language → Prefrontal "thinking loop"
 *   • Deep sleep                         →  Multi-burst Memory → Brainster → Concept Layer
 *
 * Each orb also drags a "packet" (a smaller tinted sphere) that drops
 * with a brief flash at the final lobe. Animations are claimed from a
 * zustand queue populated by the SSE stream — see use-hud-stream.ts.
 */

import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Group,
  Mesh,
  Vector3,
} from "three";
import {
  AGENT_VISUALS,
  LOBE_BY_ID,
  WORLD_POSITION,
  pathForEvent,
  type AgentVisual,
  type LobeId,
} from "./lobes";
import { useHudStreamStore, type AnimationEvent } from "./use-hud-stream";

type Anim = {
  curve: CatmullRomCurve3;
  duration: number; // seconds
  elapsed: number;
  packetActive: boolean;
  flashAt: Vector3 | null;
  flashTtl: number;
};

function homePosition(visual: AgentVisual): Vector3 {
  if (visual.home === "world") return new Vector3(...WORLD_POSITION);
  const lobe = LOBE_BY_ID[visual.home];
  // Idle slightly outside the lobe sphere so the orb doesn't overlap
  // the lobe label.
  const v = new Vector3(...lobe.position);
  const out = v.clone().normalize().multiplyScalar(lobe.radius + 0.25);
  return v.add(out);
}

function buildAnim(
  visual: AgentVisual,
  event: AnimationEvent,
): Anim | null {
  const path = pathForEvent(event.agent_slug || visual.slug, event.source);
  if (!path || path.length === 0) return null;

  const home = homePosition(visual);
  const waypoints: Vector3[] = [home];
  for (const lobeId of path) {
    const lobe = LOBE_BY_ID[lobeId as LobeId];
    if (lobe) waypoints.push(new Vector3(...lobe.position));
  }
  waypoints.push(home);

  // Catmull-Rom needs at least 2 points; pad slightly if user gave only
  // a single waypoint between the two homes.
  if (waypoints.length < 4) {
    const mid = waypoints[Math.floor(waypoints.length / 2)].clone();
    waypoints.splice(Math.floor(waypoints.length / 2), 0, mid);
  }

  const curve = new CatmullRomCurve3(waypoints, false, "catmullrom", 0.4);
  // ~0.9s per waypoint feels lively without being frantic.
  const duration = 0.9 * (waypoints.length - 1);

  return {
    curve,
    duration,
    elapsed: 0,
    packetActive: true,
    flashAt: null,
    flashTtl: 0,
  };
}

function AgentOrb({ visual }: { visual: AgentVisual }) {
  const groupRef = useRef<Group>(null);
  const packetRef = useRef<Mesh>(null);
  const flashRef = useRef<Mesh>(null);
  const animRef = useRef<Anim | null>(null);

  // Pre-computed idle bob phase so each agent drifts independently.
  const idlePhase = useMemo(() => Math.random() * Math.PI * 2, []);
  const idleHome = useMemo(() => homePosition(visual), [visual]);

  useFrame((state, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    // No animation in flight? Try to claim one.
    if (!animRef.current) {
      const event = useHudStreamStore.getState().claimAnimation(visual.slug);
      if (event) {
        const built = buildAnim(visual, event);
        if (built) animRef.current = built;
      }
    }

    const a = animRef.current;
    if (a) {
      a.elapsed += delta;
      const t = Math.min(a.elapsed / a.duration, 1);
      const p = a.curve.getPoint(t);
      grp.position.copy(p);

      if (packetRef.current) {
        // The packet trails slightly behind the orb.
        const trailT = Math.max(t - 0.02, 0);
        const trail = a.curve.getPoint(trailT);
        packetRef.current.position.set(
          trail.x - p.x,
          trail.y - p.y - 0.06,
          trail.z - p.z,
        );
        packetRef.current.visible = a.packetActive && t > 0.05 && t < 0.85;
      }

      // Drop a "flash" near the back-of-trip waypoint (~75% in)
      if (!a.flashAt && t >= 0.7) {
        a.flashAt = a.curve.getPoint(0.72).clone();
        a.flashTtl = 0.6;
      }
      if (a.flashAt && flashRef.current) {
        flashRef.current.position.set(
          a.flashAt.x - p.x,
          a.flashAt.y - p.y,
          a.flashAt.z - p.z,
        );
        a.flashTtl -= delta;
        const k = Math.max(a.flashTtl / 0.6, 0);
        const scale = 0.04 + (1 - k) * 0.35;
        flashRef.current.scale.setScalar(scale);
        flashRef.current.visible = k > 0;
      }

      if (t >= 1) {
        animRef.current = null;
        grp.position.copy(idleHome);
        if (flashRef.current) flashRef.current.visible = false;
        if (packetRef.current) packetRef.current.visible = false;
      }
    } else {
      // Idle — small bob around home.
      const t = state.clock.elapsedTime;
      grp.position.set(
        idleHome.x + 0.06 * Math.sin(t * 1.3 + idlePhase),
        idleHome.y + 0.05 * Math.cos(t * 1.1 + idlePhase),
        idleHome.z + 0.06 * Math.sin(t * 0.9 + idlePhase * 0.5),
      );
      if (flashRef.current) flashRef.current.visible = false;
      if (packetRef.current) packetRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} name={`agent-${visual.slug}`}>
      {/* Core orb */}
      <mesh>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshBasicMaterial color={visual.color} toneMapped={false} />
      </mesh>
      {/* Halo */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>
      {/* Label that always faces camera */}
      <Billboard position={[0, 0.18, 0]}>
        <Text
          fontSize={0.07}
          color={visual.color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor="#080b09"
          letterSpacing={0.08}
        >
          {visual.name}
        </Text>
      </Billboard>
      {/* Trailing packet */}
      <mesh ref={packetRef} visible={false}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* Drop flash */}
      <mesh ref={flashRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={0.45}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function AgentsScene() {
  return (
    <group name="agents-group">
      {AGENT_VISUALS.map((a) => (
        <AgentOrb key={a.slug} visual={a} />
      ))}
    </group>
  );
}
