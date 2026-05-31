"use client";

/**
 * The brain visualization.
 *
 * NOT a model of cognition. Read the header in ./lobes.ts.
 *
 * Composition:
 *   - <BrainGroup>            slowly rotating parent of the entire brain
 *     - <Synapses>            ~1800 instanced points filling an ellipsoid
 *     - <Edges>               glowing lines between lobes
 *     - <LobeSphere> × 9      labeled spheres at fixed positions
 *
 * Animated agent orbs live in ./agents-3d.tsx and parent to the same
 * BrainGroup so they rotate together with the brain.
 */

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import {
  InstancedMesh,
  Object3D,
  Color,
  Vector3,
  CatmullRomCurve3,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { LOBES, type Lobe } from "./lobes";

/**
 * ~6000 particles split into per-lobe nebulae + a thin "drifters" cloud
 * threading between them. The per-lobe distribution is what makes the
 * brain read as "regions of activity" instead of a uniform haze.
 */
const TOTAL_SYNAPSES = 6000;
const DRIFTER_COUNT = 1200; // particles not tied to any lobe — the connective tissue
const ELLIPSE = { rx: 2.6, ry: 1.5, rz: 2.1 };

function gaussian(): number {
  // Box-Muller — gives a normal distribution we can squash to taste.
  const u = Math.max(Math.random(), 1e-6);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function ellipsoidPoint(): [number, number, number] {
  // Uniform-ish points inside the ellipsoid (rejection sampled).
  let x = 0,
    y = 0,
    z = 0,
    d2 = 0;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
    d2 = x * x + y * y + z * z;
  } while (d2 > 1 || d2 < 0.001);
  const k = 0.4 + Math.random() * 0.55;
  return [x * ELLIPSE.rx * k, y * ELLIPSE.ry * k, z * ELLIPSE.rz * k];
}

type Synapse = {
  pos: [number, number, number];
  /** unit vector from origin — used for radial breathing motion */
  outward: [number, number, number];
  colorHue: number;
  colorSat: number;
  colorLit: number;
  baseScale: number;
  phase: number;
};

function Synapses() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const colorCache = useMemo(() => new Color(), []);

  const synapses = useMemo<Synapse[]>(() => {
    const out: Synapse[] = [];

    // Per-lobe nebulae — Gaussian cluster around each lobe centroid.
    // Heavier lobes (memory, hippocampus, prefrontal) get more particles.
    const lobeWeights: Record<string, number> = {
      memory: 1.4,
      hippocampus: 1.4,
      prefrontal: 1.3,
      concept: 1.1,
      sensory: 1.0,
      brainster: 1.0,
      language: 0.9,
      motor: 0.8,
      reflex: 0.8,
    };
    const totalWeight = LOBES.reduce(
      (s, l) => s + (lobeWeights[l.id] ?? 1),
      0,
    );
    const lobeBudget = TOTAL_SYNAPSES - DRIFTER_COUNT;

    for (const lobe of LOBES) {
      const w = lobeWeights[lobe.id] ?? 1;
      const count = Math.round((w / totalWeight) * lobeBudget);
      const [lx, ly, lz] = lobe.position;
      // Cluster radius scales with the lobe's own radius so big lobes
      // have wider auras.
      const cloudRadius = lobe.radius * 2.4;
      // Convert lobe color into HSL once so each particle can jitter.
      const baseColor = new Color(lobe.color);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      for (let i = 0; i < count; i++) {
        // Gaussian offset gives a soft cloud rather than a hard ball.
        const dx = gaussian() * cloudRadius * 0.55;
        const dy = gaussian() * cloudRadius * 0.55;
        const dz = gaussian() * cloudRadius * 0.55;
        const x = lx + dx;
        const y = ly + dy;
        const z = lz + dz;
        const len = Math.max(Math.hypot(x, y, z), 0.001);
        out.push({
          pos: [x, y, z],
          outward: [x / len, y / len, z / len],
          // Jitter hue +/-0.05 around the lobe color for richness.
          colorHue: (hsl.h + (Math.random() - 0.5) * 0.06 + 1) % 1,
          colorSat: 0.85 + Math.random() * 0.15,
          colorLit: 0.4 + Math.random() * 0.35,
          baseScale: 0.014 + Math.random() * 0.022,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Drifters — sparse rainbow cloud filling the gaps so the brain
    // doesn't look like 9 disconnected blobs.
    for (let i = 0; i < DRIFTER_COUNT; i++) {
      const [x, y, z] = ellipsoidPoint();
      const len = Math.max(Math.hypot(x, y, z), 0.001);
      out.push({
        pos: [x, y, z],
        outward: [x / len, y / len, z / len],
        colorHue: Math.random(),
        colorSat: 0.5 + Math.random() * 0.35,
        colorLit: 0.35 + Math.random() * 0.3,
        baseScale: 0.01 + Math.random() * 0.016,
        phase: Math.random() * Math.PI * 2,
      });
    }

    return out;
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < synapses.length; i++) {
      const s = synapses[i];
      dummy.position.set(...s.pos);
      dummy.scale.setScalar(s.baseScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      colorCache.setHSL(s.colorHue, s.colorSat, s.colorLit);
      mesh.setColorAt(i, colorCache);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [synapses, dummy, colorCache]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    // Subtle radial "breathing" + twinkle on a moving window of particles.
    // We touch ~200 instances/frame so this stays cheap at 6k total.
    const WINDOW = 220;
    const start = Math.floor(Math.random() * synapses.length);
    const breath = 1 + 0.04 * Math.sin(t * 0.55);
    for (let i = 0; i < WINDOW; i++) {
      const idx = (start + i) % synapses.length;
      const s = synapses[idx];
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.6 + s.phase);
      const scale = s.baseScale * (0.65 + 0.7 * twinkle);
      const drift = (0.5 + 0.5 * Math.sin(t * 0.7 + s.phase)) * 0.06;
      dummy.position.set(
        (s.pos[0] + s.outward[0] * drift) * breath,
        (s.pos[1] + s.outward[1] * drift) * breath,
        (s.pos[2] + s.outward[2] * drift) * breath,
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TOTAL_SYNAPSES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function LobeSphere({ lobe }: { lobe: Lobe }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    // Gentle scale pulse
    const t = state.clock.elapsedTime;
    const s = 1 + 0.04 * Math.sin(t * 1.5 + lobe.position[0] * 2);
    ref.current.scale.setScalar(s);
  });

  return (
    <group ref={ref} position={lobe.position}>
      {/* Bright nugget at center — small but full-bright, drives the bloom. */}
      <mesh>
        <sphereGeometry args={[lobe.radius * 0.3, 24, 24]} />
        <meshBasicMaterial color={lobe.color} toneMapped={false} />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[lobe.radius * 0.7, 24, 24]} />
        <meshBasicMaterial
          color={lobe.color}
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Mid halo */}
      <mesh>
        <sphereGeometry args={[lobe.radius * 1.3, 20, 20]} />
        <meshBasicMaterial
          color={lobe.color}
          transparent
          opacity={0.12}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Outer halo — barely visible, just enough to suggest gas */}
      <mesh>
        <sphereGeometry args={[lobe.radius * 2.1, 16, 16]} />
        <meshBasicMaterial
          color={lobe.color}
          transparent
          opacity={0.04}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <Billboard position={[0, lobe.radius + 0.25, 0]}>
        <Text
          fontSize={0.12}
          color="#d4e0d5"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.005}
          outlineColor="#080b09"
          letterSpacing={0.05}
        >
          {lobe.label}
        </Text>
        <Text
          fontSize={0.07}
          color="#4a5e4c"
          position={[0, 0.13, 0]}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor="#080b09"
        >
          {lobe.subsystem}
        </Text>
      </Billboard>
    </group>
  );
}

/**
 * Curved connector lines between every pair of lobes that share a
 * conceptual relationship. Drawn as Catmull-Rom curves with a slight
 * bulge so they don't look like straight wires.
 */
const EDGE_PAIRS: [string, string][] = [
  ["prefrontal", "language"],
  ["prefrontal", "hippocampus"],
  ["language", "hippocampus"],
  ["hippocampus", "memory"],
  ["sensory", "hippocampus"],
  ["sensory", "memory"],
  ["memory", "concept"],
  ["concept", "brainster"],
  ["brainster", "hippocampus"],
  ["motor", "prefrontal"],
  ["reflex", "memory"],
];

function Edges() {
  const lookup = useMemo(() => Object.fromEntries(LOBES.map((l) => [l.id, l])), []);
  const segments = useMemo(() => {
    return EDGE_PAIRS.map(([a, b]) => {
      const la = lookup[a];
      const lb = lookup[b];
      if (!la || !lb) return null;
      const start = new Vector3(...la.position);
      const end = new Vector3(...lb.position);
      const mid = start.clone().lerp(end, 0.5);
      // Pull the midpoint outward slightly so the curve bulges.
      const outward = mid.clone().normalize().multiplyScalar(0.35);
      mid.add(outward);
      const curve = new CatmullRomCurve3([start, mid, end]);
      const points = curve.getPoints(28);
      const positions: number[] = [];
      for (const p of points) positions.push(p.x, p.y, p.z);
      const geom = new BufferGeometry();
      geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
      return { geom, color: la.color };
    }).filter(Boolean) as { geom: BufferGeometry; color: string }[];
  }, [lookup]);

  return (
    <group>
      {segments.map((seg, i) => (
        <line key={i}>
          <primitive object={seg.geom} attach="geometry" />
          <lineBasicMaterial
            color={seg.color}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </line>
      ))}
    </group>
  );
}

export function BrainScene() {
  const group = useRef<Group>(null);
  // Slow rotation so every lobe sweeps into view over ~40 seconds.
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={group} name="brain-group">
      <Synapses />
      <Edges />
      {LOBES.map((l) => (
        <LobeSphere key={l.id} lobe={l} />
      ))}
    </group>
  );
}
