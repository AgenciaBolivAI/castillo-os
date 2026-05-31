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

const SYNAPSE_COUNT = 1800;
const ELLIPSE = { rx: 2.5, ry: 1.4, rz: 2.0 };

function ellipsoidPoint(): [number, number, number] {
  // Uniform-ish points on an ellipsoid (rejection-sampled on a unit
  // sphere then scaled). Good enough for a particle cloud.
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
  // Push toward the surface so the brain looks fuller at the rim than
  // the core but doesn't fight the lobes.
  const k = 0.55 + Math.random() * 0.4;
  return [x * ELLIPSE.rx * k, y * ELLIPSE.ry * k, z * ELLIPSE.rz * k];
}

function Synapses() {
  const meshRef = useRef<InstancedMesh>(null);
  const positions = useMemo(
    () => Array.from({ length: SYNAPSE_COUNT }, ellipsoidPoint),
    [],
  );
  const phases = useMemo(
    () => Array.from({ length: SYNAPSE_COUNT }, () => Math.random() * Math.PI * 2),
    [],
  );
  const dummy = useMemo(() => new Object3D(), []);
  const colorCache = useMemo(() => new Color(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < SYNAPSE_COUNT; i++) {
      dummy.position.set(...positions[i]);
      dummy.scale.setScalar(0.018 + Math.random() * 0.012);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // Mostly green-teal with rainbow accents — feel of "many lobes"
      const hue = 0.35 + Math.random() * 0.4; // green → blue → purple
      colorCache.setHSL(hue, 0.85, 0.55);
      mesh.setColorAt(i, colorCache);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [positions, dummy, colorCache]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    // Cheap "twinkle" — modulate scale on a subset each frame.
    const startIdx = Math.floor(Math.random() * SYNAPSE_COUNT * 0.95);
    for (let i = startIdx; i < startIdx + 60; i++) {
      const idx = i % SYNAPSE_COUNT;
      const p = positions[idx];
      const phase = phases[idx];
      const s =
        0.016 + 0.014 * (0.5 + 0.5 * Math.sin(t * 1.4 + phase));
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, SYNAPSE_COUNT]}
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
      <mesh>
        <sphereGeometry args={[lobe.radius, 32, 32]} />
        <meshBasicMaterial
          color={lobe.color}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* Halo */}
      <mesh>
        <sphereGeometry args={[lobe.radius * 1.6, 24, 24]} />
        <meshBasicMaterial
          color={lobe.color}
          transparent
          opacity={0.08}
          toneMapped={false}
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
